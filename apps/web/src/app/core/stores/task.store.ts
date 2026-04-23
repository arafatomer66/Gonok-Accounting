import { computed, inject } from '@angular/core';
import {
  signalStore,
  withState,
  withComputed,
  withMethods,
  patchState,
} from '@ngrx/signals';
import { PouchDbService } from '../services/pouchdb.service';
import { AuthStore } from './auth.store';
import { ITask, ETables, ETaskStatus, ETaskPriority } from '@org/shared-types';
import { ActivityLogService } from '../services/activity-log.service';

interface TaskState {
  tasks: ITask[];
  loading: boolean;
  initialized: boolean;
}

const initialState: TaskState = {
  tasks: [],
  loading: false,
  initialized: false,
};

export const TaskStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    todoTasks: computed(() =>
      store.tasks().filter((t) => t.status === ETaskStatus.TODO).sort((a, b) => a.position - b.position),
    ),
    inProgressTasks: computed(() =>
      store.tasks().filter((t) => t.status === ETaskStatus.IN_PROGRESS).sort((a, b) => a.position - b.position),
    ),
    inReviewTasks: computed(() =>
      store.tasks().filter((t) => t.status === ETaskStatus.IN_REVIEW).sort((a, b) => a.position - b.position),
    ),
    doneTasks: computed(() =>
      store.tasks().filter((t) => t.status === ETaskStatus.DONE).sort((a, b) => a.position - b.position),
    ),
    overdueTasks: computed(() => {
      const now = Date.now();
      return store.tasks().filter(
        (t) => t.status !== ETaskStatus.DONE && t.due_date != null && t.due_date < now,
      );
    }),
  })),
  withMethods((store) => {
    const pouchDb = inject(PouchDbService);
    const authStore = inject(AuthStore);
    const activityLog = inject(ActivityLogService);

    function getBizUuid(): string {
      const uuid = authStore.activeBusinessUuid();
      if (!uuid) throw new Error('No active business');
      return uuid;
    }

    function generateTaskNo(): string {
      return `TSK-${Date.now().toString(36).toUpperCase()}`;
    }

    function getNextPosition(status: ETaskStatus): number {
      const tasksInColumn = store.tasks().filter((t) => t.status === status);
      return tasksInColumn.length > 0
        ? Math.max(...tasksInColumn.map((t) => t.position)) + 1
        : 0;
    }

    return {
      async loadAll(): Promise<void> {
        const bizUuid = getBizUuid();
        patchState(store, { loading: true });
        const tasks = await pouchDb.findByBusiness<ITask>(ETables.TASK, bizUuid);
        patchState(store, { tasks, loading: false, initialized: true });
      },

      async addTask(data: Partial<ITask>): Promise<ITask> {
        const bizUuid = getBizUuid();
        const uuid = crypto.randomUUID();
        const now = Date.now();
        const status = data.status ?? ETaskStatus.TODO;

        const task: ITask = {
          uuid,
          table_type: ETables.TASK,
          business_uuid: bizUuid,
          branch_uuid: null,
          task_no: generateTaskNo(),
          title: data.title ?? '',
          description: data.description ?? null,
          assignee_uuid: data.assignee_uuid ?? null,
          assignee_name: data.assignee_name ?? null,
          status,
          priority: data.priority ?? ETaskPriority.MEDIUM,
          due_date: data.due_date ?? null,
          completed_date: null,
          position: getNextPosition(status),
          created_at: now,
          updated_at: now,
          created_by: null,
          updated_by: null,
        };

        await pouchDb.put(ETables.TASK, uuid, task as unknown as Record<string, unknown>);
        patchState(store, { tasks: [...store.tasks(), task] });
        activityLog.log('create', 'task', task.title, `${task.task_no} - Priority: ${task.priority}`);
        return task;
      },

      async updateTask(uuid: string, data: Partial<ITask>): Promise<void> {
        const existing = store.tasks().find((t) => t.uuid === uuid);
        if (!existing) return;

        const updated: ITask = {
          ...existing,
          ...data,
          updated_at: Date.now(),
          completed_date:
            data.status === ETaskStatus.DONE && existing.status !== ETaskStatus.DONE
              ? Date.now()
              : data.status && data.status !== ETaskStatus.DONE
                ? null
                : existing.completed_date,
        };

        await pouchDb.put(ETables.TASK, uuid, updated as unknown as Record<string, unknown>);
        patchState(store, {
          tasks: store.tasks().map((t) => (t.uuid === uuid ? updated : t)),
        });

        if (data.status && data.status !== existing.status) {
          activityLog.log('update', 'task', existing.title, `Status: ${existing.status} → ${data.status}`);
        }
      },

      async moveTask(uuid: string, newStatus: ETaskStatus, newPosition: number): Promise<void> {
        const existing = store.tasks().find((t) => t.uuid === uuid);
        if (!existing) return;

        const updated: ITask = {
          ...existing,
          status: newStatus,
          position: newPosition,
          updated_at: Date.now(),
          completed_date:
            newStatus === ETaskStatus.DONE && existing.status !== ETaskStatus.DONE
              ? Date.now()
              : newStatus !== ETaskStatus.DONE
                ? null
                : existing.completed_date,
        };

        await pouchDb.put(ETables.TASK, uuid, updated as unknown as Record<string, unknown>);

        // Reorder other tasks in the target column
        const otherTasks = store.tasks()
          .filter((t) => t.uuid !== uuid && t.status === newStatus)
          .sort((a, b) => a.position - b.position);

        const reordered: ITask[] = [];
        let pos = 0;
        for (const t of otherTasks) {
          if (pos === newPosition) pos++;
          const reorderedTask = { ...t, position: pos };
          if (reorderedTask.position !== t.position) {
            await pouchDb.put(ETables.TASK, t.uuid, reorderedTask as unknown as Record<string, unknown>);
          }
          reordered.push(reorderedTask);
          pos++;
        }

        patchState(store, {
          tasks: store.tasks().map((t) => {
            if (t.uuid === uuid) return updated;
            const r = reordered.find((rt) => rt.uuid === t.uuid);
            return r ?? t;
          }),
        });

        if (newStatus !== existing.status) {
          activityLog.log('update', 'task', existing.title, `Moved: ${existing.status} → ${newStatus}`);
        }
      },

      async deleteTask(uuid: string): Promise<void> {
        const existing = store.tasks().find((t) => t.uuid === uuid);
        if (!existing) return;

        await pouchDb.remove(ETables.TASK, uuid);
        patchState(store, { tasks: store.tasks().filter((t) => t.uuid !== uuid) });
        activityLog.log('delete', 'task', existing.title, existing.task_no);
      },

      getTasksByAssignee(assigneeUuid: string): ITask[] {
        return store.tasks().filter((t) => t.assignee_uuid === assigneeUuid);
      },

      reset(): void {
        patchState(store, { ...initialState });
      },
    };
  }),
);

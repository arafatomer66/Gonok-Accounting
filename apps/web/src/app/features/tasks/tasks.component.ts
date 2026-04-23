import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { TaskStore } from '../../core/stores/task.store';
import { PayrollStore } from '../../core/stores/payroll.store';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ITask, ETaskStatus, ETaskPriority } from '@org/shared-types';

@Component({
  selector: 'gonok-tasks',
  standalone: true,
  imports: [FormsModule, DatePipe, TranslateModule, ConfirmDialogComponent],
  styleUrl: './tasks.component.scss',
  template: `
    <div class="page-header">
      <h1 class="page-header__title">{{ 'task.title' | translate }}</h1>
      <div class="page-header__actions">
        <div class="view-toggle">
          <button class="btn btn--sm" [class.btn--primary]="viewMode() === 'kanban'" (click)="viewMode.set('kanban')">
            {{ 'task.kanban' | translate }}
          </button>
          <button class="btn btn--sm" [class.btn--primary]="viewMode() === 'list'" (click)="viewMode.set('list')">
            {{ 'task.list' | translate }}
          </button>
        </div>
        <button class="btn btn--primary" (click)="openForm()">+ {{ 'task.new' | translate }}</button>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="summary-cards">
      <div class="summary-card">
        <div class="summary-card__label">{{ 'task.todo' | translate }}</div>
        <div class="summary-card__value">{{ taskStore.todoTasks().length }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card__label">{{ 'task.in_progress' | translate }}</div>
        <div class="summary-card__value summary-card__value--info">{{ taskStore.inProgressTasks().length }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card__label">{{ 'task.in_review' | translate }}</div>
        <div class="summary-card__value summary-card__value--warning">{{ taskStore.inReviewTasks().length }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card__label">{{ 'task.done' | translate }}</div>
        <div class="summary-card__value summary-card__value--success">{{ taskStore.doneTasks().length }}</div>
      </div>
      @if (taskStore.overdueTasks().length > 0) {
        <div class="summary-card">
          <div class="summary-card__label">{{ 'task.overdue' | translate }}</div>
          <div class="summary-card__value summary-card__value--danger">{{ taskStore.overdueTasks().length }}</div>
        </div>
      }
    </div>

    <!-- Filters -->
    <div class="filters">
      <input
        class="form-input filter-search"
        type="text"
        [placeholder]="'task.search_placeholder' | translate"
        [ngModel]="searchTerm()"
        (ngModelChange)="searchTerm.set($event)"
        name="search"
      />
      <select class="form-input filter-select" [ngModel]="filterAssignee()" (ngModelChange)="filterAssignee.set($event)" name="filterAssignee">
        <option value="">{{ 'task.all_assignees' | translate }}</option>
        <option value="__unassigned__">{{ 'task.unassigned' | translate }}</option>
        @for (emp of payrollStore.activeEmployees(); track emp.uuid) {
          <option [value]="emp.uuid">{{ emp.name }}</option>
        }
      </select>
      <select class="form-input filter-select" [ngModel]="filterPriority()" (ngModelChange)="filterPriority.set($event)" name="filterPriority">
        <option value="">{{ 'task.all_priorities' | translate }}</option>
        <option value="urgent">{{ 'task.urgent' | translate }}</option>
        <option value="high">{{ 'task.high' | translate }}</option>
        <option value="medium">{{ 'task.medium' | translate }}</option>
        <option value="low">{{ 'task.low' | translate }}</option>
      </select>
    </div>

    <!-- Kanban View -->
    @if (viewMode() === 'kanban') {
      <div class="kanban-board">
        @for (col of columns; track col.status) {
          <div
            class="kanban-column"
            (dragover)="onDragOver($event)"
            (drop)="onDrop($event, col.status)"
            [class.kanban-column--drag-over]="dragOverColumn() === col.status"
            (dragenter)="dragOverColumn.set(col.status)"
            (dragleave)="onDragLeave($event, col.status)"
          >
            <div class="kanban-column__header">
              <span class="kanban-column__title">{{ col.labelKey | translate }}</span>
              <span class="kanban-column__count">{{ getColumnTasks(col.status).length }}</span>
            </div>
            <div class="kanban-column__body">
              @for (task of getColumnTasks(col.status); track task.uuid) {
                <div
                  class="kanban-card"
                  [class.kanban-card--overdue]="isOverdue(task)"
                  draggable="true"
                  (dragstart)="onDragStart($event, task)"
                  (dragend)="onDragEnd()"
                  (click)="editTask(task)"
                >
                  <div class="kanban-card__header">
                    <span class="kanban-card__no">{{ task.task_no }}</span>
                    <span class="badge badge--sm" [class]="'badge--' + task.priority">
                      {{ 'task.' + task.priority | translate }}
                    </span>
                  </div>
                  <div class="kanban-card__title">{{ task.title }}</div>
                  <div class="kanban-card__footer">
                    @if (task.assignee_name) {
                      <span class="kanban-card__assignee">{{ task.assignee_name }}</span>
                    } @else {
                      <span class="kanban-card__assignee kanban-card__assignee--none">{{ 'task.unassigned' | translate }}</span>
                    }
                    @if (task.due_date) {
                      <span class="kanban-card__due" [class.kanban-card__due--overdue]="isOverdue(task)">
                        {{ task.due_date | date:'dd/MM' }}
                      </span>
                    }
                  </div>
                </div>
              } @empty {
                <div class="kanban-column__empty">{{ 'task.no_tasks' | translate }}</div>
              }
            </div>
          </div>
        }
      </div>
    }

    <!-- List View -->
    @if (viewMode() === 'list') {
      <div class="card">
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>{{ 'task.task_no' | translate }}</th>
                <th>{{ 'task.task_title' | translate }}</th>
                <th>{{ 'task.assignee' | translate }}</th>
                <th>{{ 'task.status' | translate }}</th>
                <th>{{ 'task.priority' | translate }}</th>
                <th>{{ 'task.due_date' | translate }}</th>
                <th>{{ 'base.action' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              @for (task of filteredTasks(); track task.uuid) {
                <tr [class.row--overdue]="isOverdue(task)">
                  <td class="font-medium">{{ task.task_no }}</td>
                  <td>{{ task.title }}</td>
                  <td>{{ task.assignee_name || ('task.unassigned' | translate) }}</td>
                  <td>
                    <select
                      class="form-input form-input--inline"
                      [ngModel]="task.status"
                      (ngModelChange)="quickStatusChange(task, $event)"
                      [name]="'status-' + task.uuid"
                    >
                      @for (col of columns; track col.status) {
                        <option [value]="col.status">{{ col.labelKey | translate }}</option>
                      }
                    </select>
                  </td>
                  <td>
                    <span class="badge badge--sm" [class]="'badge--' + task.priority">
                      {{ 'task.' + task.priority | translate }}
                    </span>
                  </td>
                  <td [class.text-danger]="isOverdue(task)">
                    {{ task.due_date ? (task.due_date | date:'dd/MM/yyyy') : '-' }}
                  </td>
                  <td>
                    <div class="action-btns">
                      <button class="btn btn--sm btn--ghost" (click)="editTask(task)">{{ 'base.edit' | translate }}</button>
                      <button class="btn btn--sm btn--ghost text-danger" (click)="confirmDelete(task)">&times;</button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="text-center text-muted">{{ 'task.no_tasks' | translate }}</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }

    <!-- Task Form Modal -->
    @if (showForm()) {
      <div class="modal-backdrop" (click)="closeForm()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal__header">
            <h3>{{ editingUuid ? ('task.edit' | translate) : ('task.new' | translate) }}</h3>
            <button class="modal__close" (click)="closeForm()">&times;</button>
          </div>

          <div class="modal__body">
            <div class="form-group">
              <label class="form-label">{{ 'task.task_title' | translate }} *</label>
              <input class="form-input" type="text" [(ngModel)]="formTitle" name="title" />
            </div>

            <div class="form-group">
              <label class="form-label">{{ 'task.description' | translate }}</label>
              <textarea class="form-input" [(ngModel)]="formDescription" name="description" rows="3"></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">{{ 'task.assignee' | translate }}</label>
                <select class="form-input" [(ngModel)]="formAssigneeUuid" name="assignee">
                  <option value="">{{ 'task.unassigned' | translate }}</option>
                  @for (emp of payrollStore.activeEmployees(); track emp.uuid) {
                    <option [value]="emp.uuid">{{ emp.name }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">{{ 'task.status' | translate }}</label>
                <select class="form-input" [(ngModel)]="formStatus" name="status">
                  @for (col of columns; track col.status) {
                    <option [value]="col.status">{{ col.labelKey | translate }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">{{ 'task.priority' | translate }}</label>
                <select class="form-input" [(ngModel)]="formPriority" name="priority">
                  <option value="low">{{ 'task.low' | translate }}</option>
                  <option value="medium">{{ 'task.medium' | translate }}</option>
                  <option value="high">{{ 'task.high' | translate }}</option>
                  <option value="urgent">{{ 'task.urgent' | translate }}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">{{ 'task.due_date' | translate }}</label>
                <input class="form-input" type="date" [(ngModel)]="formDueDate" name="dueDate" />
              </div>
            </div>

            @if (formError()) {
              <p class="form-error">{{ formError() }}</p>
            }
          </div>

          <div class="modal__footer">
            @if (editingUuid) {
              <button class="btn btn--danger" (click)="confirmDelete(editingTask()!)">{{ 'base.delete' | translate }}</button>
            }
            <div class="modal__footer-right">
              <button class="btn btn--ghost" (click)="closeForm()">{{ 'base.cancel' | translate }}</button>
              <button class="btn btn--primary" (click)="saveTask()" [disabled]="saving()">
                {{ saving() ? ('base.saving' | translate) : ('base.save' | translate) }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Confirm Dialog -->
    <gonok-confirm-dialog
      [visible]="showDeleteConfirm()"
      [title]="'base.delete' | translate"
      [message]="'task.delete_confirm' | translate"
      variant="danger"
      (confirmed)="onDeleteConfirmed()"
      (cancelled)="showDeleteConfirm.set(false)"
    />
  `,
})
export class TasksComponent implements OnInit {
  taskStore = inject(TaskStore);
  payrollStore = inject(PayrollStore);

  viewMode = signal<'kanban' | 'list'>('kanban');
  showForm = signal(false);
  saving = signal(false);
  formError = signal('');
  searchTerm = signal('');
  filterAssignee = signal('');
  filterPriority = signal('');
  dragOverColumn = signal<ETaskStatus | null>(null);
  showDeleteConfirm = signal(false);
  deletingTask = signal<ITask | null>(null);
  private draggingTaskUuid = signal<string | null>(null);

  columns = [
    { status: ETaskStatus.TODO, labelKey: 'task.todo' },
    { status: ETaskStatus.IN_PROGRESS, labelKey: 'task.in_progress' },
    { status: ETaskStatus.IN_REVIEW, labelKey: 'task.in_review' },
    { status: ETaskStatus.DONE, labelKey: 'task.done' },
  ];

  // Form fields
  editingUuid = '';
  formTitle = '';
  formDescription = '';
  formAssigneeUuid = '';
  formStatus = ETaskStatus.TODO;
  formPriority = ETaskPriority.MEDIUM;
  formDueDate = '';

  editingTask = computed(() =>
    this.editingUuid ? this.taskStore.tasks().find((t) => t.uuid === this.editingUuid) ?? null : null,
  );

  filteredTasks = computed(() => {
    let tasks = this.taskStore.tasks().sort((a, b) => {
      const statusOrder = [ETaskStatus.TODO, ETaskStatus.IN_PROGRESS, ETaskStatus.IN_REVIEW, ETaskStatus.DONE];
      const diff = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
      return diff !== 0 ? diff : a.position - b.position;
    });

    const search = this.searchTerm().toLowerCase();
    if (search) {
      tasks = tasks.filter((t) =>
        t.title.toLowerCase().includes(search) || t.task_no.toLowerCase().includes(search),
      );
    }

    const assignee = this.filterAssignee();
    if (assignee === '__unassigned__') {
      tasks = tasks.filter((t) => !t.assignee_uuid);
    } else if (assignee) {
      tasks = tasks.filter((t) => t.assignee_uuid === assignee);
    }

    const priority = this.filterPriority();
    if (priority) {
      tasks = tasks.filter((t) => t.priority === priority);
    }

    return tasks;
  });

  ngOnInit(): void {
    if (!this.taskStore.initialized()) this.taskStore.loadAll();
    if (!this.payrollStore.initialized()) this.payrollStore.loadAll();
  }

  getColumnTasks(status: ETaskStatus): ITask[] {
    return this.filteredTasks().filter((t) => t.status === status);
  }

  isOverdue(task: ITask): boolean {
    return task.status !== ETaskStatus.DONE && task.due_date != null && task.due_date < Date.now();
  }

  // Drag and drop
  onDragStart(event: DragEvent, task: ITask): void {
    event.dataTransfer?.setData('text/plain', task.uuid);
    event.dataTransfer!.effectAllowed = 'move';
    this.draggingTaskUuid.set(task.uuid);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
  }

  onDragLeave(event: DragEvent, status: ETaskStatus): void {
    const target = event.currentTarget as HTMLElement;
    if (!target.contains(event.relatedTarget as Node)) {
      if (this.dragOverColumn() === status) {
        this.dragOverColumn.set(null);
      }
    }
  }

  onDragEnd(): void {
    this.draggingTaskUuid.set(null);
    this.dragOverColumn.set(null);
  }

  async onDrop(event: DragEvent, targetStatus: ETaskStatus): Promise<void> {
    event.preventDefault();
    this.dragOverColumn.set(null);
    const uuid = event.dataTransfer?.getData('text/plain');
    if (!uuid) return;

    const tasksInColumn = this.getColumnTasks(targetStatus).filter((t) => t.uuid !== uuid);
    const newPosition = tasksInColumn.length;

    await this.taskStore.moveTask(uuid, targetStatus, newPosition);
    this.draggingTaskUuid.set(null);
  }

  // Quick status change in list view
  async quickStatusChange(task: ITask, newStatus: ETaskStatus): Promise<void> {
    await this.taskStore.updateTask(task.uuid, { status: newStatus });
  }

  // Form
  openForm(): void {
    this.editingUuid = '';
    this.formTitle = '';
    this.formDescription = '';
    this.formAssigneeUuid = '';
    this.formStatus = ETaskStatus.TODO;
    this.formPriority = ETaskPriority.MEDIUM;
    this.formDueDate = '';
    this.formError.set('');
    this.showForm.set(true);
  }

  editTask(task: ITask): void {
    this.editingUuid = task.uuid;
    this.formTitle = task.title;
    this.formDescription = task.description || '';
    this.formAssigneeUuid = task.assignee_uuid || '';
    this.formStatus = task.status;
    this.formPriority = task.priority;
    this.formDueDate = task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '';
    this.formError.set('');
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  async saveTask(): Promise<void> {
    if (!this.formTitle.trim()) {
      this.formError.set('Title is required');
      return;
    }

    this.saving.set(true);

    const employee = this.payrollStore.activeEmployees().find((e) => e.uuid === this.formAssigneeUuid);

    const data: Partial<ITask> = {
      title: this.formTitle.trim(),
      description: this.formDescription.trim() || null,
      assignee_uuid: this.formAssigneeUuid || null,
      assignee_name: employee?.name ?? null,
      status: this.formStatus,
      priority: this.formPriority,
      due_date: this.formDueDate ? new Date(this.formDueDate).getTime() : null,
    };

    if (this.editingUuid) {
      await this.taskStore.updateTask(this.editingUuid, data);
    } else {
      await this.taskStore.addTask(data);
    }

    this.saving.set(false);
    this.closeForm();
  }

  confirmDelete(task: ITask): void {
    this.deletingTask.set(task);
    this.showDeleteConfirm.set(true);
  }

  async onDeleteConfirmed(): Promise<void> {
    const task = this.deletingTask();
    if (task) {
      await this.taskStore.deleteTask(task.uuid);
    }
    this.showDeleteConfirm.set(false);
    this.deletingTask.set(null);
    this.showForm.set(false);
  }
}

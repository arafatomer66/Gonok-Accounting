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
import { IEmployee, ISalary, ETables } from '@org/shared-types';
import { ActivityLogService } from '../services/activity-log.service';

interface PayrollState {
  employees: IEmployee[];
  salaries: ISalary[];
  loading: boolean;
  initialized: boolean;
}

const initialState: PayrollState = {
  employees: [],
  salaries: [],
  loading: false,
  initialized: false,
};

export const PayrollStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    activeEmployees: computed(() => store.employees().filter((e) => e.active)),
    totalMonthlyPayroll: computed(() =>
      store.employees().filter((e) => e.active).reduce((s, e) => s + e.base_salary, 0),
    ),
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

    return {
      async loadAll(): Promise<void> {
        const bizUuid = getBizUuid();
        patchState(store, { loading: true });
        const [employees, salaries] = await Promise.all([
          pouchDb.findByBusiness<IEmployee>(ETables.EMPLOYEE, bizUuid),
          pouchDb.findByBusiness<ISalary>(ETables.SALARY, bizUuid),
        ]);
        patchState(store, { employees, salaries, loading: false, initialized: true });
      },

      async addEmployee(data: Partial<IEmployee>): Promise<IEmployee> {
        const bizUuid = getBizUuid();
        const uuid = crypto.randomUUID();
        const now = Date.now();

        const employee: IEmployee = {
          uuid,
          table_type: ETables.EMPLOYEE,
          business_uuid: bizUuid,
          branch_uuid: null,
          name: data.name || '',
          phone: data.phone ?? null,
          designation: data.designation ?? null,
          department: data.department ?? null,
          join_date: data.join_date ?? now,
          base_salary: data.base_salary ?? 0,
          active: data.active ?? true,
          created_at: now,
          updated_at: now,
          created_by: null,
          updated_by: null,
        };

        await pouchDb.put(ETables.EMPLOYEE, uuid, employee as unknown as Record<string, unknown>);
        patchState(store, { employees: [...store.employees(), employee] });
        activityLog.log('create', 'employee', employee.name, `Salary: ${employee.base_salary}`);
        return employee;
      },

      async updateEmployee(uuid: string, data: Partial<IEmployee>): Promise<void> {
        const existing = store.employees().find((e) => e.uuid === uuid);
        if (!existing) return;

        const updated: IEmployee = { ...existing, ...data, updated_at: Date.now() };
        await pouchDb.put(ETables.EMPLOYEE, uuid, updated as unknown as Record<string, unknown>);
        patchState(store, {
          employees: store.employees().map((e) => (e.uuid === uuid ? updated : e)),
        });
      },

      async deleteEmployee(uuid: string): Promise<void> {
        const existing = store.employees().find((e) => e.uuid === uuid);
        if (!existing) return;

        await pouchDb.remove(ETables.EMPLOYEE, uuid);
        patchState(store, { employees: store.employees().filter((e) => e.uuid !== uuid) });
        activityLog.log('delete', 'employee', existing.name, '');
      },

      async addSalary(data: Partial<ISalary>): Promise<ISalary> {
        const bizUuid = getBizUuid();
        const uuid = crypto.randomUUID();
        const now = Date.now();

        const salary: ISalary = {
          uuid,
          table_type: ETables.SALARY,
          business_uuid: bizUuid,
          branch_uuid: null,
          employee_uuid: data.employee_uuid || '',
          employee_name: data.employee_name || '',
          month: data.month ?? new Date().getMonth() + 1,
          year: data.year ?? new Date().getFullYear(),
          base_salary: data.base_salary ?? 0,
          bonus: data.bonus ?? 0,
          deduction: data.deduction ?? 0,
          advance: data.advance ?? 0,
          net_salary: data.net_salary ?? 0,
          paid: data.paid ?? false,
          paid_date: data.paid_date ?? null,
          payment_type: data.payment_type ?? null,
          notes: data.notes ?? null,
          created_at: now,
          updated_at: now,
          created_by: null,
          updated_by: null,
        };

        await pouchDb.put(ETables.SALARY, uuid, salary as unknown as Record<string, unknown>);
        patchState(store, { salaries: [...store.salaries(), salary] });
        activityLog.log('create', 'salary', `${salary.employee_name} - ${salary.month}/${salary.year}`, `Net: ${salary.net_salary}`);
        return salary;
      },

      async updateSalary(uuid: string, data: Partial<ISalary>): Promise<void> {
        const existing = store.salaries().find((s) => s.uuid === uuid);
        if (!existing) return;

        const updated: ISalary = { ...existing, ...data, updated_at: Date.now() };
        await pouchDb.put(ETables.SALARY, uuid, updated as unknown as Record<string, unknown>);
        patchState(store, {
          salaries: store.salaries().map((s) => (s.uuid === uuid ? updated : s)),
        });
      },

      async deleteSalary(uuid: string): Promise<void> {
        const existing = store.salaries().find((s) => s.uuid === uuid);
        if (!existing) return;

        await pouchDb.remove(ETables.SALARY, uuid);
        patchState(store, { salaries: store.salaries().filter((s) => s.uuid !== uuid) });
      },

      reset(): void {
        patchState(store, { ...initialState });
      },
    };
  }),
);

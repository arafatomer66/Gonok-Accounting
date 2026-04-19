import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, DatePipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { PayrollStore } from '../../core/stores/payroll.store';
import { IEmployee, ISalary } from '@org/shared-types';

@Component({
  selector: 'gonok-payroll',
  standalone: true,
  imports: [FormsModule, DecimalPipe, DatePipe, TranslateModule],
  styleUrl: './payroll.component.scss',
  template: `
    <div class="page-header">
      <h1 class="page-header__title">{{ 'payroll.title' | translate }}</h1>
    </div>

    <!-- Tabs -->
    <div class="payroll-tabs">
      <button class="payroll-tab" [class.payroll-tab--active]="activeTab() === 'employees'" (click)="activeTab.set('employees')">
        {{ 'payroll.employees' | translate }} ({{ payrollStore.activeEmployees().length }})
      </button>
      <button class="payroll-tab" [class.payroll-tab--active]="activeTab() === 'salary'" (click)="activeTab.set('salary')">
        {{ 'payroll.salary_sheet' | translate }}
      </button>
      <button class="payroll-tab" [class.payroll-tab--active]="activeTab() === 'history'" (click)="activeTab.set('history')">
        {{ 'payroll.history' | translate }}
      </button>
    </div>

    <!-- ─── EMPLOYEES TAB ─── -->
    @if (activeTab() === 'employees') {
      <div class="tab-header">
        <div class="summary-inline">
          <span>{{ 'payroll.total_monthly' | translate }}: <strong>&#2547;{{ payrollStore.totalMonthlyPayroll() | number:'1.0-0' }}</strong></span>
        </div>
        <button class="btn btn--primary" (click)="openEmployeeForm()">+ {{ 'payroll.add_employee' | translate }}</button>
      </div>

      <div class="card">
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>{{ 'base.name' | translate }}</th>
                <th>{{ 'payroll.designation' | translate }}</th>
                <th>{{ 'payroll.department' | translate }}</th>
                <th>{{ 'base.phone_no' | translate }}</th>
                <th>{{ 'payroll.join_date' | translate }}</th>
                <th class="text-right">{{ 'payroll.base_salary' | translate }}</th>
                <th>{{ 'base.action' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              @for (emp of payrollStore.activeEmployees(); track emp.uuid) {
                <tr>
                  <td class="font-medium">{{ emp.name }}</td>
                  <td>{{ emp.designation || '-' }}</td>
                  <td>{{ emp.department || '-' }}</td>
                  <td>{{ emp.phone || '-' }}</td>
                  <td>{{ emp.join_date | date:'dd/MM/yyyy' }}</td>
                  <td class="text-right font-medium">&#2547;{{ emp.base_salary | number:'1.0-0' }}</td>
                  <td>
                    <div class="action-btns">
                      <button class="btn btn--sm btn--ghost" (click)="editEmployee(emp)">{{ 'base.edit' | translate }}</button>
                      <button class="btn btn--sm btn--ghost text-danger" (click)="confirmDeleteEmployee(emp)">&times;</button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="text-center text-muted">No employees added yet</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }

    <!-- ─── SALARY SHEET TAB ─── -->
    @if (activeTab() === 'salary') {
      <div class="tab-header">
        <div class="month-selector">
          <select class="form-input" [(ngModel)]="salaryMonth" name="salaryMonth">
            @for (m of months; track m.value) {
              <option [value]="m.value">{{ m.label }}</option>
            }
          </select>
          <select class="form-input" [(ngModel)]="salaryYear" name="salaryYear">
            @for (y of years; track y) {
              <option [value]="y">{{ y }}</option>
            }
          </select>
        </div>
        <button class="btn btn--primary" (click)="generateSalarySheet()" [disabled]="generatingSheet()">
          {{ generatingSheet() ? 'Generating...' : ('payroll.generate_sheet' | translate) }}
        </button>
      </div>

      <div class="card">
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>{{ 'base.name' | translate }}</th>
                <th class="text-right">{{ 'payroll.base_salary' | translate }}</th>
                <th class="text-right">{{ 'payroll.bonus' | translate }}</th>
                <th class="text-right">{{ 'payroll.deduction' | translate }}</th>
                <th class="text-right">{{ 'payroll.advance' | translate }}</th>
                <th class="text-right">{{ 'payroll.net_salary' | translate }}</th>
                <th>{{ 'quotation.status' | translate }}</th>
                <th>{{ 'base.action' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              @for (sal of currentMonthSalaries(); track sal.uuid) {
                <tr>
                  <td class="font-medium">{{ sal.employee_name }}</td>
                  <td class="text-right">&#2547;{{ sal.base_salary | number:'1.0-0' }}</td>
                  <td>
                    <input class="inline-input text-right" type="number" [value]="sal.bonus" (change)="updateSalaryField(sal, 'bonus', $event)" min="0" />
                  </td>
                  <td>
                    <input class="inline-input text-right" type="number" [value]="sal.deduction" (change)="updateSalaryField(sal, 'deduction', $event)" min="0" />
                  </td>
                  <td>
                    <input class="inline-input text-right" type="number" [value]="sal.advance" (change)="updateSalaryField(sal, 'advance', $event)" min="0" />
                  </td>
                  <td class="text-right font-medium">&#2547;{{ sal.net_salary | number:'1.0-0' }}</td>
                  <td>
                    @if (sal.paid) {
                      <span class="badge badge--success">Paid</span>
                    } @else {
                      <span class="badge badge--warning">Pending</span>
                    }
                  </td>
                  <td>
                    @if (!sal.paid) {
                      <button class="btn btn--sm btn--primary" (click)="markAsPaid(sal)">{{ 'payroll.pay' | translate }}</button>
                    } @else {
                      <span class="text-muted text-sm">{{ sal.paid_date | date:'dd/MM' }}</span>
                    }
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="8" class="text-center text-muted">No salary sheet for this month. Click "Generate Sheet" to create.</td></tr>
              }
            </tbody>
            @if (currentMonthSalaries().length > 0) {
              <tfoot>
                <tr class="total-row">
                  <td class="font-medium">Total</td>
                  <td class="text-right">&#2547;{{ totalBase() | number:'1.0-0' }}</td>
                  <td class="text-right">&#2547;{{ totalBonus() | number:'1.0-0' }}</td>
                  <td class="text-right">&#2547;{{ totalDeduction() | number:'1.0-0' }}</td>
                  <td class="text-right">&#2547;{{ totalAdvance() | number:'1.0-0' }}</td>
                  <td class="text-right font-medium">&#2547;{{ totalNet() | number:'1.0-0' }}</td>
                  <td colspan="2">
                    <button class="btn btn--sm btn--primary" (click)="payAll()" [disabled]="allPaid()">
                      {{ 'payroll.pay_all' | translate }}
                    </button>
                  </td>
                </tr>
              </tfoot>
            }
          </table>
        </div>
      </div>
    }

    <!-- ─── HISTORY TAB ─── -->
    @if (activeTab() === 'history') {
      <div class="card">
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>{{ 'payroll.period' | translate }}</th>
                <th>{{ 'base.name' | translate }}</th>
                <th class="text-right">{{ 'payroll.net_salary' | translate }}</th>
                <th>{{ 'payroll.paid_date' | translate }}</th>
                <th>{{ 'payroll.payment_type' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              @for (sal of paidSalaries(); track sal.uuid) {
                <tr>
                  <td>{{ sal.month }}/{{ sal.year }}</td>
                  <td class="font-medium">{{ sal.employee_name }}</td>
                  <td class="text-right">&#2547;{{ sal.net_salary | number:'1.0-0' }}</td>
                  <td>{{ sal.paid_date | date:'dd/MM/yyyy' }}</td>
                  <td>{{ sal.payment_type || 'Cash' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="text-center text-muted">No salary payments yet</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }

    <!-- Employee Form Modal -->
    @if (showEmployeeForm()) {
      <div class="modal-backdrop" (click)="closeEmployeeForm()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal__header">
            <h3>{{ editingEmployeeUuid ? ('payroll.edit_employee' | translate) : ('payroll.add_employee' | translate) }}</h3>
            <button class="modal__close" (click)="closeEmployeeForm()">&times;</button>
          </div>

          <div class="modal__body">
            <div class="form-group">
              <label class="form-label">{{ 'base.name' | translate }} *</label>
              <input class="form-input" type="text" [(ngModel)]="empName" name="empName" />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">{{ 'payroll.designation' | translate }}</label>
                <input class="form-input" type="text" [(ngModel)]="empDesignation" name="empDesig" placeholder="e.g. Manager, Salesman" />
              </div>
              <div class="form-group">
                <label class="form-label">{{ 'payroll.department' | translate }}</label>
                <input class="form-input" type="text" [(ngModel)]="empDepartment" name="empDept" placeholder="e.g. Sales, Warehouse" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">{{ 'base.phone_no' | translate }}</label>
                <input class="form-input" type="tel" [(ngModel)]="empPhone" name="empPhone" />
              </div>
              <div class="form-group">
                <label class="form-label">{{ 'payroll.base_salary' | translate }} *</label>
                <input class="form-input" type="number" [(ngModel)]="empSalary" name="empSalary" min="0" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">{{ 'payroll.join_date' | translate }}</label>
              <input class="form-input" type="date" [(ngModel)]="empJoinDate" name="empJoin" />
            </div>

            @if (empError()) {
              <p class="form-error">{{ empError() }}</p>
            }
          </div>

          <div class="modal__footer">
            <button class="btn btn--ghost" (click)="closeEmployeeForm()">{{ 'base.cancel' | translate }}</button>
            <button class="btn btn--primary" (click)="saveEmployee()">{{ 'base.save' | translate }}</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class PayrollComponent implements OnInit {
  payrollStore = inject(PayrollStore);

  activeTab = signal<'employees' | 'salary' | 'history'>('employees');
  showEmployeeForm = signal(false);
  generatingSheet = signal(false);
  empError = signal('');

  // Month/Year selectors
  salaryMonth = new Date().getMonth() + 1;
  salaryYear = new Date().getFullYear();

  months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' },
    { value: 3, label: 'March' }, { value: 4, label: 'April' },
    { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' },
    { value: 9, label: 'September' }, { value: 10, label: 'October' },
    { value: 11, label: 'November' }, { value: 12, label: 'December' },
  ];

  years: number[] = [];

  // Employee form
  editingEmployeeUuid = '';
  empName = '';
  empDesignation = '';
  empDepartment = '';
  empPhone = '';
  empSalary = 0;
  empJoinDate = '';

  // Computed
  currentMonthSalaries = computed(() =>
    this.payrollStore.salaries().filter(
      (s) => s.month === this.salaryMonth && s.year === this.salaryYear,
    ),
  );

  paidSalaries = computed(() =>
    this.payrollStore.salaries()
      .filter((s) => s.paid)
      .sort((a, b) => (b.paid_date || 0) - (a.paid_date || 0)),
  );

  totalBase = computed(() => this.currentMonthSalaries().reduce((s, x) => s + x.base_salary, 0));
  totalBonus = computed(() => this.currentMonthSalaries().reduce((s, x) => s + x.bonus, 0));
  totalDeduction = computed(() => this.currentMonthSalaries().reduce((s, x) => s + x.deduction, 0));
  totalAdvance = computed(() => this.currentMonthSalaries().reduce((s, x) => s + x.advance, 0));
  totalNet = computed(() => this.currentMonthSalaries().reduce((s, x) => s + x.net_salary, 0));
  allPaid = computed(() => this.currentMonthSalaries().length > 0 && this.currentMonthSalaries().every((s) => s.paid));

  ngOnInit(): void {
    if (!this.payrollStore.initialized()) this.payrollStore.loadAll();
    const currentYear = new Date().getFullYear();
    this.years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  }

  // ─── Employee CRUD ───
  openEmployeeForm(): void {
    this.editingEmployeeUuid = '';
    this.empName = '';
    this.empDesignation = '';
    this.empDepartment = '';
    this.empPhone = '';
    this.empSalary = 0;
    this.empJoinDate = new Date().toISOString().split('T')[0];
    this.empError.set('');
    this.showEmployeeForm.set(true);
  }

  editEmployee(emp: IEmployee): void {
    this.editingEmployeeUuid = emp.uuid;
    this.empName = emp.name;
    this.empDesignation = emp.designation || '';
    this.empDepartment = emp.department || '';
    this.empPhone = emp.phone || '';
    this.empSalary = emp.base_salary;
    this.empJoinDate = new Date(emp.join_date).toISOString().split('T')[0];
    this.empError.set('');
    this.showEmployeeForm.set(true);
  }

  closeEmployeeForm(): void {
    this.showEmployeeForm.set(false);
  }

  async saveEmployee(): Promise<void> {
    if (!this.empName.trim()) {
      this.empError.set('Name is required');
      return;
    }
    if (this.empSalary <= 0) {
      this.empError.set('Salary must be greater than 0');
      return;
    }

    const data: Partial<IEmployee> = {
      name: this.empName.trim(),
      designation: this.empDesignation.trim() || null,
      department: this.empDepartment.trim() || null,
      phone: this.empPhone.trim() || null,
      base_salary: this.empSalary,
      join_date: new Date(this.empJoinDate).getTime(),
    };

    if (this.editingEmployeeUuid) {
      await this.payrollStore.updateEmployee(this.editingEmployeeUuid, data);
    } else {
      await this.payrollStore.addEmployee(data);
    }

    this.closeEmployeeForm();
  }

  async confirmDeleteEmployee(emp: IEmployee): Promise<void> {
    if (confirm(`Delete employee "${emp.name}"?`)) {
      await this.payrollStore.deleteEmployee(emp.uuid);
    }
  }

  // ─── Salary Sheet ───
  async generateSalarySheet(): Promise<void> {
    const existing = this.currentMonthSalaries();
    if (existing.length > 0) {
      if (!confirm('Salary sheet already exists for this month. Regenerate? (Existing unpaid entries will be replaced)')) {
        return;
      }
      // Delete existing unpaid entries
      for (const sal of existing.filter((s) => !s.paid)) {
        await this.payrollStore.deleteSalary(sal.uuid);
      }
    }

    this.generatingSheet.set(true);
    const employees = this.payrollStore.activeEmployees();
    const existingPaid = existing.filter((s) => s.paid).map((s) => s.employee_uuid);

    for (const emp of employees) {
      if (existingPaid.includes(emp.uuid)) continue;

      await this.payrollStore.addSalary({
        employee_uuid: emp.uuid,
        employee_name: emp.name,
        month: this.salaryMonth,
        year: this.salaryYear,
        base_salary: emp.base_salary,
        bonus: 0,
        deduction: 0,
        advance: 0,
        net_salary: emp.base_salary,
        paid: false,
      });
    }

    this.generatingSheet.set(false);
  }

  async updateSalaryField(sal: ISalary, field: 'bonus' | 'deduction' | 'advance', event: Event): Promise<void> {
    const value = Number((event.target as HTMLInputElement).value) || 0;
    const updates: Partial<ISalary> = { [field]: value };

    const base = sal.base_salary;
    const bonus = field === 'bonus' ? value : sal.bonus;
    const deduction = field === 'deduction' ? value : sal.deduction;
    const advance = field === 'advance' ? value : sal.advance;
    updates.net_salary = base + bonus - deduction - advance;

    await this.payrollStore.updateSalary(sal.uuid, updates);
  }

  async markAsPaid(sal: ISalary): Promise<void> {
    await this.payrollStore.updateSalary(sal.uuid, {
      paid: true,
      paid_date: Date.now(),
      payment_type: 'Cash',
    });
  }

  async payAll(): Promise<void> {
    const unpaid = this.currentMonthSalaries().filter((s) => !s.paid);
    for (const sal of unpaid) {
      await this.payrollStore.updateSalary(sal.uuid, {
        paid: true,
        paid_date: Date.now(),
        payment_type: 'Cash',
      });
    }
  }
}

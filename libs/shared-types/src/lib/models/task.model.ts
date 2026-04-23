import { IBaseModel, ICouchDoc } from './base.model.js';
import { ETaskStatus, ETaskPriority } from '../enums/task.enum.js';

export interface ITask extends IBaseModel, ICouchDoc {
  uuid: string;
  business_uuid: string | null;
  branch_uuid: string | null;
  task_no: string;
  title: string;
  description: string | null;
  assignee_uuid: string | null;
  assignee_name: string | null;
  status: ETaskStatus;
  priority: ETaskPriority;
  due_date: number | null;
  completed_date: number | null;
  position: number;
}

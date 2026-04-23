import { IBaseModel, ICouchDoc } from './base.model.js';
import { EVehicleStatus, ETripStatus } from '../enums/logistics.enum.js';

export interface IVehicle extends IBaseModel, ICouchDoc {
  uuid: string;
  business_uuid: string | null;
  branch_uuid: string | null;
  name: string;
  plate_number: string;
  vehicle_type: string | null;
  capacity: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  status: EVehicleStatus;
  notes: string | null;
}

export interface ITrip extends IBaseModel, ICouchDoc {
  uuid: string;
  business_uuid: string | null;
  branch_uuid: string | null;
  trip_no: string;
  vehicle_uuid: string | null;
  vehicle_name: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  trip_date: number;
  start_time: number | null;
  end_time: number | null;
  status: ETripStatus;
  origin: string | null;
  destination: string | null;
  total_stops: number;
  total_deliveries: number;
  notes: string | null;
}

export interface ITripStop extends IBaseModel, ICouchDoc {
  uuid: string;
  business_uuid: string | null;
  trip_uuid: string;
  delivery_uuid: string | null;
  party_name: string | null;
  address: string | null;
  stop_order: number;
  status: 'pending' | 'completed' | 'skipped';
  arrived_at: number | null;
  notes: string | null;
}

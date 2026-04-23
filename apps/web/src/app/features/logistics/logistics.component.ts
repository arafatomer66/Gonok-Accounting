import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LogisticsStore } from '../../core/stores/logistics.store';
import { DeliveryStore } from '../../core/stores/delivery.store';
import { CatalogStore } from '../../core/stores/catalog.store';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import {
  IVehicle,
  ITrip,
  ITripStop,
  EVehicleStatus,
} from '@org/shared-types';

@Component({
  selector: 'gonok-logistics',
  standalone: true,
  imports: [FormsModule, DatePipe, TranslateModule, SearchInputComponent, ConfirmDialogComponent],
  styleUrl: './logistics.component.scss',
  template: `
    <div class="page-header">
      <h1 class="page-header__title">{{ 'logistics.title' | translate }}</h1>
    </div>

    <!-- View Tabs -->
    <div class="view-tabs">
      <button class="view-tab" [class.view-tab--active]="activeView() === 'overview'" (click)="activeView.set('overview')">
        {{ 'logistics.overview' | translate }}
      </button>
      <button class="view-tab" [class.view-tab--active]="activeView() === 'vehicles'" (click)="activeView.set('vehicles')">
        {{ 'logistics.vehicles' | translate }} ({{ logisticsStore.vehicles().length }})
      </button>
      <button class="view-tab" [class.view-tab--active]="activeView() === 'trips'" (click)="activeView.set('trips')">
        {{ 'logistics.trips' | translate }} ({{ logisticsStore.trips().length }})
      </button>
    </div>

    <!-- ═══ OVERVIEW ═══ -->
    @if (activeView() === 'overview') {
      <div class="summary-cards">
        <div class="summary-card">
          <div class="summary-card__label">{{ 'logistics.active_vehicles' | translate }}</div>
          <div class="summary-card__value summary-card__value--success">{{ logisticsStore.activeVehicles().length }}</div>
        </div>
        <div class="summary-card">
          <div class="summary-card__label">{{ 'logistics.in_maintenance' | translate }}</div>
          <div class="summary-card__value summary-card__value--warning">{{ logisticsStore.maintenanceVehicles().length }}</div>
        </div>
        <div class="summary-card">
          <div class="summary-card__label">{{ 'logistics.active_trips' | translate }}</div>
          <div class="summary-card__value summary-card__value--info">{{ logisticsStore.activeTrips().length }}</div>
        </div>
        <div class="summary-card">
          <div class="summary-card__label">{{ 'logistics.pending_deliveries' | translate }}</div>
          <div class="summary-card__value summary-card__value--danger">{{ deliveryStore.pending().length }}</div>
        </div>
      </div>

      <!-- Active Trips -->
      @if (logisticsStore.activeTrips().length > 0 || logisticsStore.plannedTrips().length > 0) {
        <h3 class="section-title">{{ 'logistics.upcoming_active' | translate }}</h3>
        <div class="trip-cards">
          @for (trip of [...logisticsStore.activeTrips(), ...logisticsStore.plannedTrips()]; track trip.uuid) {
            <div class="trip-card" [class.trip-card--active]="trip.status === 'in_progress'">
              <div class="trip-card__header">
                <span class="trip-card__no">{{ trip.trip_no }}</span>
                <span class="badge" [class]="'badge ' + getTripStatusClass(trip.status)">
                  {{ 'logistics.' + trip.status | translate }}
                </span>
              </div>
              <div class="trip-card__body">
                @if (trip.vehicle_name) {
                  <div class="trip-card__detail">🚛 {{ trip.vehicle_name }}</div>
                }
                @if (trip.driver_name) {
                  <div class="trip-card__detail">👤 {{ trip.driver_name }}</div>
                }
                <div class="trip-card__detail">📍 {{ trip.total_stops }} stops</div>
                <div class="trip-card__detail">📅 {{ trip.trip_date | date:'dd/MM/yyyy' }}</div>
              </div>
              <div class="trip-card__actions">
                @if (trip.status === 'planned') {
                  <button class="btn btn--sm btn--primary" (click)="startTrip(trip)">{{ 'logistics.start' | translate }}</button>
                }
                @if (trip.status === 'in_progress') {
                  <button class="btn btn--sm btn--primary" (click)="confirmComplete(trip)">{{ 'logistics.complete' | translate }}</button>
                }
                <button class="btn btn--sm btn--ghost" (click)="viewTripDetails(trip)">{{ 'base.details' | translate }}</button>
              </div>
            </div>
          }
        </div>
      }

      <!-- Pending Deliveries without trip -->
      @if (deliveryStore.pending().length > 0) {
        <h3 class="section-title mt-4">{{ 'logistics.unassigned_deliveries' | translate }}</h3>
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>Challan #</th>
                <th>Party</th>
                <th>Items</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              @for (d of deliveryStore.pending(); track d.uuid) {
                <tr>
                  <td class="text-mono">{{ d.delivery_no }}</td>
                  <td>{{ getPartyName(d.party_uuid) }}</td>
                  <td>{{ d.total_items }} ({{ d.total_quantity }})</td>
                  <td>{{ d.delivery_date | date:'dd/MM' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }

    <!-- ═══ VEHICLES ═══ -->
    @if (activeView() === 'vehicles') {
      <div class="section-header">
        <gonok-search-input placeholder="Search vehicles..." (searchChange)="vehicleSearch.set($event)" />
        <button class="btn btn--primary" (click)="openVehicleForm()">+ {{ 'logistics.add_vehicle' | translate }}</button>
      </div>

      <div class="vehicle-grid">
        @for (vehicle of filteredVehicles(); track vehicle.uuid) {
          <div class="vehicle-card" [class.vehicle-card--maintenance]="vehicle.status === 'maintenance'" [class.vehicle-card--inactive]="vehicle.status === 'inactive'">
            <div class="vehicle-card__header">
              <span class="vehicle-card__name">{{ vehicle.name }}</span>
              <span class="badge badge--sm" [class]="'badge ' + getVehicleStatusClass(vehicle.status)">
                {{ 'logistics.' + vehicle.status | translate }}
              </span>
            </div>
            <div class="vehicle-card__plate">{{ vehicle.plate_number }}</div>
            @if (vehicle.vehicle_type) {
              <div class="vehicle-card__detail">{{ vehicle.vehicle_type }}</div>
            }
            @if (vehicle.driver_name) {
              <div class="vehicle-card__detail">👤 {{ vehicle.driver_name }} {{ vehicle.driver_phone ? '(' + vehicle.driver_phone + ')' : '' }}</div>
            }
            @if (vehicle.capacity) {
              <div class="vehicle-card__detail">📦 {{ vehicle.capacity }}</div>
            }
            <div class="vehicle-card__actions">
              <button class="btn btn--sm btn--ghost" (click)="editVehicle(vehicle)">{{ 'base.edit' | translate }}</button>
              <button class="btn btn--sm btn--ghost btn--danger-text" (click)="confirmDeleteVehicle(vehicle)">Delete</button>
            </div>
          </div>
        } @empty {
          <div class="empty-state">{{ 'logistics.no_vehicles' | translate }}</div>
        }
      </div>
    }

    <!-- ═══ TRIPS ═══ -->
    @if (activeView() === 'trips') {
      <div class="section-header">
        <gonok-search-input placeholder="Search trips..." (searchChange)="tripSearch.set($event)" />
        <button class="btn btn--primary" (click)="openTripForm()">+ {{ 'logistics.new_trip' | translate }}</button>
      </div>

      <!-- Trip Status Tabs -->
      <div class="status-tabs">
        @for (tab of tripTabs; track tab.key) {
          <button class="status-tab" [class.status-tab--active]="tripFilter() === tab.key" (click)="tripFilter.set(tab.key)">
            {{ tab.label | translate }} ({{ getTripTabCount(tab.key) }})
          </button>
        }
      </div>

      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>{{ 'logistics.trip_no' | translate }}</th>
              <th>{{ 'base.date' | translate }}</th>
              <th>{{ 'logistics.vehicle' | translate }}</th>
              <th>{{ 'logistics.driver' | translate }}</th>
              <th>Stops</th>
              <th>{{ 'logistics.status' | translate }}</th>
              <th>{{ 'base.action' | translate }}</th>
            </tr>
          </thead>
          <tbody>
            @for (trip of filteredTrips(); track trip.uuid) {
              <tr>
                <td class="text-mono">{{ trip.trip_no }}</td>
                <td>{{ trip.trip_date | date:'dd/MM/yyyy' }}</td>
                <td>{{ trip.vehicle_name || '-' }}</td>
                <td>{{ trip.driver_name || '-' }}</td>
                <td>{{ trip.total_stops }}</td>
                <td>
                  <span class="badge" [class]="'badge ' + getTripStatusClass(trip.status)">
                    {{ 'logistics.' + trip.status | translate }}
                  </span>
                </td>
                <td>
                  <div class="action-btns">
                    @if (trip.status === 'planned') {
                      <button class="btn btn--sm btn--primary" (click)="startTrip(trip)">{{ 'logistics.start' | translate }}</button>
                      <button class="btn btn--sm btn--ghost" (click)="editTrip(trip)">{{ 'base.edit' | translate }}</button>
                      <button class="btn btn--sm btn--ghost btn--danger-text" (click)="confirmDeleteTrip(trip)">Delete</button>
                    }
                    @if (trip.status === 'in_progress') {
                      <button class="btn btn--sm btn--primary" (click)="confirmComplete(trip)">{{ 'logistics.complete' | translate }}</button>
                      <button class="btn btn--sm btn--ghost" (click)="viewTripDetails(trip)">{{ 'base.details' | translate }}</button>
                    }
                    @if (trip.status === 'completed' || trip.status === 'cancelled') {
                      <button class="btn btn--sm btn--ghost" (click)="viewTripDetails(trip)">{{ 'base.details' | translate }}</button>
                    }
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7" class="text-center text-muted">{{ 'logistics.no_trips' | translate }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <!-- ═══ VEHICLE FORM MODAL ═══ -->
    @if (showVehicleForm()) {
      <div class="modal-backdrop" (click)="showVehicleForm.set(false)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal__header">
            <h3 class="modal__title">{{ (editingVehicle() ? 'logistics.edit_vehicle' : 'logistics.add_vehicle') | translate }}</h3>
            <button class="modal__close" (click)="showVehicleForm.set(false)">&times;</button>
          </div>
          <div class="modal__body">
            <div class="form-group">
              <label class="form-label">{{ 'logistics.vehicle_name' | translate }} *</label>
              <input class="form-input" [(ngModel)]="vName" name="vName" placeholder="e.g. Delivery Van 1" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">{{ 'logistics.plate_number' | translate }} *</label>
                <input class="form-input" [(ngModel)]="vPlate" name="vPlate" placeholder="e.g. ঢাকা মেট্রো গ-১২৩৪" />
              </div>
              <div class="form-group">
                <label class="form-label">{{ 'logistics.vehicle_type' | translate }}</label>
                <select class="form-input" [(ngModel)]="vType" name="vType">
                  <option value="">-- Select --</option>
                  <option value="Van">Van</option>
                  <option value="Truck">Truck</option>
                  <option value="Pickup">Pickup</option>
                  <option value="Motorcycle">Motorcycle</option>
                  <option value="Bicycle">Bicycle</option>
                  <option value="CNG">CNG</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">{{ 'logistics.driver' | translate }}</label>
                <input class="form-input" [(ngModel)]="vDriver" name="vDriver" />
              </div>
              <div class="form-group">
                <label class="form-label">{{ 'logistics.driver_phone' | translate }}</label>
                <input class="form-input" [(ngModel)]="vDriverPhone" name="vDriverPhone" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">{{ 'logistics.capacity' | translate }}</label>
                <input class="form-input" [(ngModel)]="vCapacity" name="vCapacity" placeholder="e.g. 1 ton" />
              </div>
              <div class="form-group">
                <label class="form-label">{{ 'logistics.status' | translate }}</label>
                <select class="form-input" [(ngModel)]="vStatus" name="vStatus">
                  <option value="active">{{ 'logistics.active' | translate }}</option>
                  <option value="maintenance">{{ 'logistics.maintenance' | translate }}</option>
                  <option value="inactive">{{ 'logistics.inactive' | translate }}</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">{{ 'logistics.notes' | translate }}</label>
              <textarea class="form-input" [(ngModel)]="vNotes" name="vNotes" rows="2"></textarea>
            </div>
            @if (formError()) {
              <p class="form-error">{{ formError() }}</p>
            }
          </div>
          <div class="modal__footer">
            <button class="btn btn--ghost" (click)="showVehicleForm.set(false)">{{ 'base.cancel' | translate }}</button>
            <button class="btn btn--primary" (click)="saveVehicle()" [disabled]="saving()">{{ 'base.save' | translate }}</button>
          </div>
        </div>
      </div>
    }

    <!-- ═══ TRIP FORM MODAL ═══ -->
    @if (showTripForm()) {
      <div class="modal-backdrop" (click)="showTripForm.set(false)">
        <div class="modal modal--wide" (click)="$event.stopPropagation()">
          <div class="modal__header">
            <h3 class="modal__title">{{ (editingTrip() ? 'logistics.edit_trip' : 'logistics.new_trip') | translate }}</h3>
            <button class="modal__close" (click)="showTripForm.set(false)">&times;</button>
          </div>
          <div class="modal__body">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">{{ 'logistics.vehicle' | translate }}</label>
                <select class="form-input" [(ngModel)]="tVehicleUuid" name="tVehicle" (ngModelChange)="onVehicleSelected()">
                  <option value="">-- Select Vehicle --</option>
                  @for (v of logisticsStore.activeVehicles(); track v.uuid) {
                    <option [value]="v.uuid">{{ v.name }} ({{ v.plate_number }})</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">{{ 'logistics.trip_date' | translate }}</label>
                <input class="form-input" type="date" [(ngModel)]="tDate" name="tDate" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">{{ 'logistics.driver' | translate }}</label>
                <input class="form-input" [(ngModel)]="tDriver" name="tDriver" />
              </div>
              <div class="form-group">
                <label class="form-label">{{ 'logistics.driver_phone' | translate }}</label>
                <input class="form-input" [(ngModel)]="tDriverPhone" name="tDriverPhone" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">{{ 'logistics.origin' | translate }}</label>
                <input class="form-input" [(ngModel)]="tOrigin" name="tOrigin" placeholder="Starting point" />
              </div>
              <div class="form-group">
                <label class="form-label">{{ 'logistics.destination' | translate }}</label>
                <input class="form-input" [(ngModel)]="tDestination" name="tDestination" placeholder="Final destination" />
              </div>
            </div>

            <!-- Stops -->
            <div class="form-group">
              <label class="form-label">{{ 'logistics.stops' | translate }}</label>
              <div class="stop-add-row">
                <input class="form-input" [(ngModel)]="addStopParty" name="addParty" placeholder="Party / Location name" />
                <input class="form-input" [(ngModel)]="addStopAddress" name="addAddr" placeholder="Address" />
                <button class="btn btn--primary btn--sm" type="button" (click)="addStop()">+</button>
              </div>
            </div>
            @if (tripStops.length > 0) {
              <div class="table-wrapper">
                <table class="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Party / Location</th>
                      <th>Address</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (stop of tripStops; track stop.stop_order; let i = $index) {
                      <tr>
                        <td>{{ i + 1 }}</td>
                        <td>{{ stop.party_name }}</td>
                        <td>{{ stop.address || '-' }}</td>
                        <td>
                          <button class="btn btn--sm btn--ghost btn--danger-text" (click)="removeStop(i)">&times;</button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }

            <div class="form-group">
              <label class="form-label">{{ 'logistics.notes' | translate }}</label>
              <textarea class="form-input" [(ngModel)]="tNotes" name="tNotes" rows="2"></textarea>
            </div>

            @if (formError()) {
              <p class="form-error">{{ formError() }}</p>
            }
          </div>
          <div class="modal__footer">
            <button class="btn btn--ghost" (click)="showTripForm.set(false)">{{ 'base.cancel' | translate }}</button>
            <button class="btn btn--primary" (click)="saveTrip()" [disabled]="saving()">{{ 'base.save' | translate }}</button>
          </div>
        </div>
      </div>
    }

    <!-- ═══ TRIP DETAIL MODAL ═══ -->
    @if (viewingTrip()) {
      <div class="modal-backdrop" (click)="viewingTrip.set(null)">
        <div class="modal modal--wide" (click)="$event.stopPropagation()">
          <div class="modal__header">
            <h3 class="modal__title">{{ viewingTrip()!.trip_no }}</h3>
            <button class="modal__close" (click)="viewingTrip.set(null)">&times;</button>
          </div>
          <div class="modal__body">
            <div class="detail-grid">
              <div><strong>{{ 'logistics.vehicle' | translate }}:</strong> {{ viewingTrip()!.vehicle_name || '-' }}</div>
              <div><strong>{{ 'logistics.driver' | translate }}:</strong> {{ viewingTrip()!.driver_name || '-' }}</div>
              <div><strong>{{ 'base.date' | translate }}:</strong> {{ viewingTrip()!.trip_date | date:'dd/MM/yyyy' }}</div>
              <div><strong>{{ 'logistics.status' | translate }}:</strong> {{ viewingTrip()!.status }}</div>
              @if (viewingTrip()!.origin) {
                <div><strong>{{ 'logistics.origin' | translate }}:</strong> {{ viewingTrip()!.origin }}</div>
              }
              @if (viewingTrip()!.destination) {
                <div><strong>{{ 'logistics.destination' | translate }}:</strong> {{ viewingTrip()!.destination }}</div>
              }
            </div>

            @if (viewStops().length > 0) {
              <h4 class="mt-4">{{ 'logistics.stops' | translate }} ({{ viewStops().length }})</h4>
              <div class="stop-timeline">
                @for (stop of viewStops(); track stop.uuid; let i = $index) {
                  <div class="stop-item" [class.stop-item--completed]="stop.status === 'completed'" [class.stop-item--skipped]="stop.status === 'skipped'">
                    <div class="stop-item__marker">{{ i + 1 }}</div>
                    <div class="stop-item__content">
                      <div class="stop-item__name">{{ stop.party_name || 'Stop ' + (i + 1) }}</div>
                      @if (stop.address) {
                        <div class="stop-item__address">{{ stop.address }}</div>
                      }
                      <div class="stop-item__status">
                        <span class="badge badge--sm" [class.badge--success]="stop.status === 'completed'" [class.badge--secondary]="stop.status === 'pending'" [class.badge--warning]="stop.status === 'skipped'">
                          {{ stop.status }}
                        </span>
                        @if (stop.arrived_at) {
                          <span class="stop-item__time">{{ stop.arrived_at | date:'HH:mm' }}</span>
                        }
                      </div>
                    </div>
                    @if (viewingTrip()!.status === 'in_progress' && stop.status === 'pending') {
                      <div class="stop-item__actions">
                        <button class="btn btn--sm btn--primary" (click)="markStopCompleted(stop)">Done</button>
                        <button class="btn btn--sm btn--ghost" (click)="markStopSkipped(stop)">Skip</button>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
          <div class="modal__footer">
            <button class="btn btn--ghost" (click)="viewingTrip.set(null)">{{ 'base.back' | translate }}</button>
          </div>
        </div>
      </div>
    }

    <!-- Confirm Dialog -->
    <gonok-confirm-dialog
      [visible]="confirmAction() !== null"
      [title]="confirmTitle()"
      [message]="confirmMsg()"
      [variant]="confirmVar()"
      (confirmed)="onConfirmed()"
      (cancelled)="confirmAction.set(null)"
    />
  `,
})
export class LogisticsComponent implements OnInit {
  logisticsStore = inject(LogisticsStore);
  deliveryStore = inject(DeliveryStore);
  private catalogStore = inject(CatalogStore);

  activeView = signal<'overview' | 'vehicles' | 'trips'>('overview');
  vehicleSearch = signal('');
  tripSearch = signal('');
  tripFilter = signal('all');
  formError = signal('');
  saving = signal(false);

  // Vehicle form
  showVehicleForm = signal(false);
  editingVehicle = signal<IVehicle | null>(null);
  vName = ''; vPlate = ''; vType = ''; vDriver = ''; vDriverPhone = '';
  vCapacity = ''; vStatus = 'active'; vNotes = '';

  // Trip form
  showTripForm = signal(false);
  editingTrip = signal<ITrip | null>(null);
  tVehicleUuid = ''; tDate = new Date().toISOString().split('T')[0];
  tDriver = ''; tDriverPhone = ''; tOrigin = ''; tDestination = ''; tNotes = '';
  tripStops: Partial<ITripStop>[] = [];
  addStopParty = ''; addStopAddress = '';

  // Trip detail
  viewingTrip = signal<ITrip | null>(null);
  viewStops = signal<ITripStop[]>([]);

  // Confirm
  confirmAction = signal<{ type: string; data: any } | null>(null);
  confirmTitle = signal('');
  confirmMsg = signal('');
  confirmVar = signal<'primary' | 'danger'>('primary');

  tripTabs = [
    { key: 'all', label: 'base.total' },
    { key: 'planned', label: 'logistics.planned' },
    { key: 'in_progress', label: 'logistics.in_progress' },
    { key: 'completed', label: 'logistics.completed' },
    { key: 'cancelled', label: 'logistics.cancelled' },
  ];

  filteredVehicles = computed(() => {
    const term = this.vehicleSearch().toLowerCase();
    let vehicles = this.logisticsStore.vehicles();
    if (term) {
      vehicles = vehicles.filter((v) =>
        v.name.toLowerCase().includes(term) ||
        v.plate_number.toLowerCase().includes(term) ||
        (v.driver_name || '').toLowerCase().includes(term),
      );
    }
    return vehicles;
  });

  filteredTrips = computed(() => {
    let trips = this.logisticsStore.trips();
    const tab = this.tripFilter();
    if (tab !== 'all') trips = trips.filter((t) => t.status === tab);
    const term = this.tripSearch().toLowerCase();
    if (term) {
      trips = trips.filter((t) =>
        t.trip_no.toLowerCase().includes(term) ||
        (t.vehicle_name || '').toLowerCase().includes(term) ||
        (t.driver_name || '').toLowerCase().includes(term),
      );
    }
    return [...trips].sort((a, b) => b.trip_date - a.trip_date);
  });

  async ngOnInit(): Promise<void> {
    if (!this.logisticsStore.initialized()) this.logisticsStore.loadAll();
    if (!this.deliveryStore.initialized()) this.deliveryStore.loadAll();
    if (!this.catalogStore.initialized()) this.catalogStore.loadAll();
  }

  getPartyName(uuid: string | null): string {
    if (!uuid) return '-';
    const party = this.catalogStore.allParties().find((p) => p.uuid === uuid);
    return party?.name || '-';
  }

  getTripStatusClass(status: string): string {
    const m: Record<string, string> = { planned: 'badge--info', in_progress: 'badge--warning', completed: 'badge--success', cancelled: 'badge--danger' };
    return m[status] || '';
  }

  getVehicleStatusClass(status: string): string {
    const m: Record<string, string> = { active: 'badge--success', maintenance: 'badge--warning', inactive: 'badge--secondary' };
    return m[status] || '';
  }

  getTripTabCount(key: string): number {
    if (key === 'all') return this.logisticsStore.trips().length;
    return this.logisticsStore.trips().filter((t) => t.status === key).length;
  }

  // ─── Vehicle ───────────────────────────
  openVehicleForm(): void {
    this.editingVehicle.set(null);
    this.vName = ''; this.vPlate = ''; this.vType = ''; this.vDriver = '';
    this.vDriverPhone = ''; this.vCapacity = ''; this.vStatus = 'active'; this.vNotes = '';
    this.formError.set('');
    this.showVehicleForm.set(true);
  }

  editVehicle(v: IVehicle): void {
    this.editingVehicle.set(v);
    this.vName = v.name; this.vPlate = v.plate_number; this.vType = v.vehicle_type || '';
    this.vDriver = v.driver_name || ''; this.vDriverPhone = v.driver_phone || '';
    this.vCapacity = v.capacity || ''; this.vStatus = v.status; this.vNotes = v.notes || '';
    this.formError.set('');
    this.showVehicleForm.set(true);
  }

  async saveVehicle(): Promise<void> {
    if (!this.vName.trim() || !this.vPlate.trim()) {
      this.formError.set('Name and plate number are required');
      return;
    }
    this.saving.set(true);
    const data: Partial<IVehicle> = {
      name: this.vName.trim(),
      plate_number: this.vPlate.trim(),
      vehicle_type: this.vType || null,
      driver_name: this.vDriver.trim() || null,
      driver_phone: this.vDriverPhone.trim() || null,
      capacity: this.vCapacity.trim() || null,
      status: this.vStatus as EVehicleStatus,
      notes: this.vNotes.trim() || null,
    };
    const editing = this.editingVehicle();
    if (editing) {
      await this.logisticsStore.updateVehicle(editing.uuid, data);
    } else {
      await this.logisticsStore.addVehicle(data);
    }
    this.showVehicleForm.set(false);
    this.saving.set(false);
  }

  confirmDeleteVehicle(v: IVehicle): void {
    this.confirmAction.set({ type: 'delete-vehicle', data: v });
    this.confirmTitle.set('Delete Vehicle');
    this.confirmMsg.set(`Delete ${v.name}?`);
    this.confirmVar.set('danger');
  }

  // ─── Trip ──────────────────────────────
  openTripForm(): void {
    this.editingTrip.set(null);
    this.tVehicleUuid = ''; this.tDate = new Date().toISOString().split('T')[0];
    this.tDriver = ''; this.tDriverPhone = ''; this.tOrigin = ''; this.tDestination = '';
    this.tNotes = ''; this.tripStops = [];
    this.formError.set('');
    this.showTripForm.set(true);
  }

  async editTrip(trip: ITrip): Promise<void> {
    this.editingTrip.set(trip);
    this.tVehicleUuid = trip.vehicle_uuid || '';
    this.tDate = new Date(trip.trip_date).toISOString().split('T')[0];
    this.tDriver = trip.driver_name || ''; this.tDriverPhone = trip.driver_phone || '';
    this.tOrigin = trip.origin || ''; this.tDestination = trip.destination || '';
    this.tNotes = trip.notes || '';
    this.tripStops = await this.logisticsStore.getTripStops(trip.uuid);
    this.formError.set('');
    this.showTripForm.set(true);
  }

  onVehicleSelected(): void {
    const v = this.logisticsStore.vehicles().find((v) => v.uuid === this.tVehicleUuid);
    if (v) {
      this.tDriver = v.driver_name || '';
      this.tDriverPhone = v.driver_phone || '';
    }
  }

  addStop(): void {
    if (!this.addStopParty.trim()) return;
    this.tripStops = [...this.tripStops, {
      party_name: this.addStopParty.trim(),
      address: this.addStopAddress.trim() || null,
      stop_order: this.tripStops.length + 1,
    }];
    this.addStopParty = '';
    this.addStopAddress = '';
  }

  removeStop(i: number): void {
    this.tripStops = this.tripStops.filter((_, idx) => idx !== i);
  }

  async saveTrip(): Promise<void> {
    if (this.tripStops.length === 0) {
      this.formError.set('Add at least one stop');
      return;
    }
    this.saving.set(true);
    const vehicle = this.logisticsStore.vehicles().find((v) => v.uuid === this.tVehicleUuid);
    const data: Partial<ITrip> = {
      vehicle_uuid: this.tVehicleUuid || null,
      vehicle_name: vehicle?.name ?? null,
      driver_name: this.tDriver.trim() || null,
      driver_phone: this.tDriverPhone.trim() || null,
      trip_date: new Date(this.tDate).getTime(),
      origin: this.tOrigin.trim() || null,
      destination: this.tDestination.trim() || null,
      notes: this.tNotes.trim() || null,
    };
    const editing = this.editingTrip();
    if (editing) {
      // Delete old trip and recreate (simpler than diffing stops)
      await this.logisticsStore.deleteTrip(editing.uuid);
    }
    await this.logisticsStore.addTrip(data, this.tripStops);
    this.showTripForm.set(false);
    this.saving.set(false);
  }

  async startTrip(trip: ITrip): Promise<void> {
    await this.logisticsStore.startTrip(trip.uuid);
  }

  confirmComplete(trip: ITrip): void {
    this.confirmAction.set({ type: 'complete-trip', data: trip });
    this.confirmTitle.set('Complete Trip');
    this.confirmMsg.set(`Mark trip ${trip.trip_no} as completed?`);
    this.confirmVar.set('primary');
  }

  confirmDeleteTrip(trip: ITrip): void {
    this.confirmAction.set({ type: 'delete-trip', data: trip });
    this.confirmTitle.set('Delete Trip');
    this.confirmMsg.set(`Delete trip ${trip.trip_no}?`);
    this.confirmVar.set('danger');
  }

  async viewTripDetails(trip: ITrip): Promise<void> {
    const stops = await this.logisticsStore.getTripStops(trip.uuid);
    this.viewStops.set(stops);
    this.viewingTrip.set(trip);
  }

  async markStopCompleted(stop: ITripStop): Promise<void> {
    await this.logisticsStore.updateTripStop(stop.uuid, { status: 'completed', arrived_at: Date.now() });
    if (this.viewingTrip()) {
      const stops = await this.logisticsStore.getTripStops(this.viewingTrip()!.uuid);
      this.viewStops.set(stops);
    }
  }

  async markStopSkipped(stop: ITripStop): Promise<void> {
    await this.logisticsStore.updateTripStop(stop.uuid, { status: 'skipped' });
    if (this.viewingTrip()) {
      const stops = await this.logisticsStore.getTripStops(this.viewingTrip()!.uuid);
      this.viewStops.set(stops);
    }
  }

  async onConfirmed(): Promise<void> {
    const action = this.confirmAction();
    if (!action) return;
    this.confirmAction.set(null);
    if (action.type === 'delete-vehicle') {
      await this.logisticsStore.deleteVehicle(action.data.uuid);
    } else if (action.type === 'complete-trip') {
      await this.logisticsStore.completeTrip(action.data.uuid);
    } else if (action.type === 'delete-trip') {
      await this.logisticsStore.deleteTrip(action.data.uuid);
    }
  }
}

import { CreateBillOverlay } from './CreateBillOverlay';
import { ActivityOverlay } from './ActivityOverlay';
import { CustomerDetailOverlay } from './CustomerDetailOverlay';
import { StaffDetailOverlay } from './StaffDetailOverlay';
import { AddCreditSheet, AddInventorySheet, AddStaffSheet } from './AddSheets';
import { useAppStore } from '@/state/store';

/**
 * Single overlay slot (handoff: "Overlay system"). Rendered in the root layout
 * above the tab navigator; any non-null overlay hides nav + pinned CTA.
 */
export function OverlayHost() {
  const overlay = useAppStore((s) => s.overlay);
  switch (overlay) {
    case 'createBill':
      return <CreateBillOverlay />;
    case 'activity':
      return <ActivityOverlay />;
    case 'customer':
      return <CustomerDetailOverlay />;
    case 'staffDetail':
      return <StaffDetailOverlay />;
    case 'addCredit':
      return <AddCreditSheet />;
    case 'addInventory':
      return <AddInventorySheet />;
    case 'addStaff':
      return <AddStaffSheet />;
    default:
      return null;
  }
}

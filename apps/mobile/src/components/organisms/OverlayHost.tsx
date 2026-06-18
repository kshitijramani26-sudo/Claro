import { CreateBillOverlay } from './CreateBillOverlay';
import { ActivityOverlay } from './ActivityOverlay';
import { CustomerDetailOverlay } from './CustomerDetailOverlay';
import { StaffDetailOverlay } from './StaffDetailOverlay';
import { InvoiceSummaryOverlay } from './InvoiceSummaryOverlay';
import { SearchOverlay } from './SearchOverlay';
import { CustomerActivityOverlay } from './CustomerActivityOverlay';
import { AddCreditSheet, AddInventorySheet, AddStaffSheet, SettleSheet } from './AddSheets';
import { TeamOverlay } from './TeamOverlay';
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
    case 'invoice':
      return <InvoiceSummaryOverlay />;
    case 'search':
      return <SearchOverlay />;
    case 'customerActivity':
      return <CustomerActivityOverlay />;
    case 'addCredit':
      return <AddCreditSheet />;
    case 'addInventory':
    case 'editInventory':
      return <AddInventorySheet />;
    case 'addStaff':
      return <AddStaffSheet />;
    case 'settle':
      return <SettleSheet />;
    case 'team':
      return <TeamOverlay />;
    default:
      return null;
  }
}

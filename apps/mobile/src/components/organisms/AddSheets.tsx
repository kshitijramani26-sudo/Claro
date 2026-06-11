import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { PrimaryButton } from '@/components/atoms/Button';
import { Tap } from '@/components/atoms/Tap';
import { ContactSuggest } from '@/components/molecules/ContactSuggest';
import { api } from '@/lib/api';
import { formatINR } from '@/lib/format';
import { Colors, Radius } from '@/theme/tokens';
import { Font, tnum } from '@/theme/typography';
import { usePageTheme } from '@/theme/pageThemes';
import { useAppStore } from '@/state/store';

/** Sheet input — 52px, radius 9, #F7F8FA bg, #E7E9F2 border, accent focus. */
function Field({
  placeholder,
  value,
  onChangeText,
  accent,
  keyboardType,
  flex,
}: {
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  accent: string;
  keyboardType?: 'number-pad' | 'phone-pad';
  flex?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={Colors.textMuted}
      keyboardType={keyboardType}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        height: 52,
        borderRadius: Radius.tile,
        borderWidth: 1.5,
        borderColor: focused ? accent : Colors.border,
        backgroundColor: Colors.inputBg,
        paddingHorizontal: 14,
        fontFamily: Font.semibold,
        fontSize: 14.5,
        color: Colors.textPrimary,
        flex: flex ? 1 : undefined,
      }}
    />
  );
}

export function AddCreditSheet() {
  const theme = usePageTheme('khata');
  const closeOverlay = useAppStore((s) => s.closeOverlay);
  const flashToast = useAppStore((s) => s.flashToast);
  const refresh = useAppStore((s) => s.refresh);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const amt = parseFloat(amount);
    if (!name.trim() || !(amt > 0)) {
      flashToast('Enter a customer name and amount');
      return;
    }
    setSaving(true);
    try {
      await api.addCredit({ name: name.trim(), phone, amountRupees: amt, note });
      refresh();
      flashToast('Credit record added');
      closeOverlay();
    } catch (e) {
      flashToast((e as Error).message);
      setSaving(false);
    }
  };

  return (
    <BottomSheet title="Add Credit Record" onClose={closeOverlay}>
      <View style={{ gap: 12 }}>
        <Field placeholder="Customer name" value={name} onChangeText={setName} accent={theme.accent} />
        <ContactSuggest query={name} accent={theme.accent} onPick={(h) => { setName(h.name); setPhone(h.phone); }} />
        <Field placeholder="Phone number" value={phone} onChangeText={setPhone} accent={theme.accent} keyboardType="phone-pad" />
        <Field placeholder="Credit amount (₹)" value={amount} onChangeText={setAmount} accent={theme.accent} keyboardType="number-pad" />
        <Field placeholder="Note (optional)" value={note} onChangeText={setNote} accent={theme.accent} />
        <PrimaryButton label={saving ? 'Saving…' : 'Save credit record'} disabled={saving} onPress={save} style={{ marginTop: 8 }} />
      </View>
    </BottomSheet>
  );
}

export function AddInventorySheet() {
  const theme = usePageTheme('stock');
  const closeOverlay = useAppStore((s) => s.closeOverlay);
  const flashToast = useAppStore((s) => s.flashToast);
  const refresh = useAppStore((s) => s.refresh);
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [threshold, setThreshold] = useState('');
  const [cost, setCost] = useState('');
  const [selling, setSelling] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const price = parseFloat(selling);
    if (!name.trim() || !(price >= 0)) {
      flashToast('Enter an item name and selling price');
      return;
    }
    setSaving(true);
    try {
      await api.addInventory({
        name: name.trim(),
        qty: Math.max(0, parseInt(qty, 10) || 0),
        threshold: Math.max(0, parseInt(threshold, 10) || 10),
        costRupees: parseFloat(cost) || 0,
        priceRupees: price,
      });
      refresh();
      flashToast('Item added to inventory');
      closeOverlay();
    } catch (e) {
      flashToast((e as Error).message);
      setSaving(false);
    }
  };

  return (
    <BottomSheet title="Add Inventory" onClose={closeOverlay}>
      <View style={{ gap: 12 }}>
        <Field placeholder="Item name" value={name} onChangeText={setName} accent={theme.accent} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Field placeholder="Quantity" value={qty} onChangeText={setQty} accent={theme.accent} keyboardType="number-pad" flex />
          <Field placeholder="Low-stock threshold" value={threshold} onChangeText={setThreshold} accent={theme.accent} keyboardType="number-pad" flex />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Field placeholder="Cost price (₹)" value={cost} onChangeText={setCost} accent={theme.accent} keyboardType="number-pad" flex />
          <Field placeholder="Selling price (₹)" value={selling} onChangeText={setSelling} accent={theme.accent} keyboardType="number-pad" flex />
        </View>
        <PrimaryButton label={saving ? 'Saving…' : 'Add item'} disabled={saving} onPress={save} style={{ marginTop: 8 }} />
      </View>
    </BottomSheet>
  );
}

export function AddStaffSheet() {
  const theme = usePageTheme('staff');
  const closeOverlay = useAppStore((s) => s.closeOverlay);
  const flashToast = useAppStore((s) => s.flashToast);
  const refresh = useAppStore((s) => s.refresh);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [salary, setSalary] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) {
      flashToast('Enter the staff member’s name');
      return;
    }
    setSaving(true);
    try {
      await api.addStaff({ name: name.trim(), role, phone, salaryRupees: parseFloat(salary) || 0 });
      refresh();
      flashToast('Staff member added');
      closeOverlay();
    } catch (e) {
      flashToast((e as Error).message);
      setSaving(false);
    }
  };

  return (
    <BottomSheet title="Add Staff" onClose={closeOverlay}>
      <View style={{ gap: 12 }}>
        <Field placeholder="Full name" value={name} onChangeText={setName} accent={theme.accent} />
        <ContactSuggest query={name} accent={theme.accent} onPick={(h) => { setName(h.name); setPhone(h.phone); }} />
        <Field placeholder="Role (e.g. Cashier)" value={role} onChangeText={setRole} accent={theme.accent} />
        <Field placeholder="Phone number" value={phone} onChangeText={setPhone} accent={theme.accent} keyboardType="phone-pad" />
        <Field placeholder="Monthly salary (₹)" value={salary} onChangeText={setSalary} accent={theme.accent} keyboardType="number-pad" />
        <PrimaryButton label={saving ? 'Saving…' : 'Add staff member'} disabled={saving} onPress={save} style={{ marginTop: 8 }} />
      </View>
    </BottomSheet>
  );
}

export function SettleSheet() {
  const theme = usePageTheme('khata');
  const target = useAppStore((s) => s.selSettle);
  const closeOverlay = useAppStore((s) => s.closeOverlay);
  const flashToast = useAppStore((s) => s.flashToast);
  const refresh = useAppStore((s) => s.refresh);
  const outstanding = target?.outstanding ?? 0;
  const [amount, setAmount] = useState(String(outstanding));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!target) return;
    const amt = parseFloat(amount);
    if (!(amt > 0)) {
      flashToast('Enter an amount to settle');
      return;
    }
    if (amt > outstanding + 0.001) {
      flashToast('Amount exceeds the outstanding balance');
      return;
    }
    setSaving(true);
    try {
      await api.settleUp(target.id, amt);
      refresh();
      flashToast('Settled ' + formatINR(amt));
      closeOverlay();
    } catch (e) {
      flashToast((e as Error).message);
      setSaving(false);
    }
  };

  return (
    <BottomSheet title={`Settle ${target?.name ?? ''}`.trim()} onClose={closeOverlay}>
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: Font.medium, fontSize: 13, color: Colors.textSecondary }}>Outstanding</Text>
          <Text style={[{ fontFamily: Font.extrabold, fontSize: 15, color: Colors.danger }, tnum]}>{formatINR(outstanding)}</Text>
        </View>
        <Field placeholder="Amount to settle (₹)" value={amount} onChangeText={setAmount} accent={theme.accent} keyboardType="number-pad" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[0.25, 0.5, 1].map((frac) => (
            <Tap
              key={frac}
              onPress={() => setAmount(String(Math.round(outstanding * frac)))}
              style={{
                flex: 1, height: 38, borderRadius: Radius.tile, borderWidth: 1.5, borderColor: Colors.border,
                backgroundColor: Colors.canvas, alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: Font.bold, fontSize: 12.5, color: Colors.textSecondary }}>
                {frac === 1 ? 'Full' : `${frac * 100}%`}
              </Text>
            </Tap>
          ))}
        </View>
        <PrimaryButton label={saving ? 'Settling…' : 'Record payment'} disabled={saving} onPress={save} style={{ marginTop: 8 }} />
      </View>
    </BottomSheet>
  );
}

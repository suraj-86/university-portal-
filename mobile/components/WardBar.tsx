import React from 'react';
import { useWards } from '@/context/WardContext';
import { SelectField } from '@/components/ui';

// Parents: pick which child every page is showing. Hidden when there is only one.
export default function WardBar() {
  const { wards, ward, select } = useWards();
  if (wards.length < 2 || !ward) return null;
  return (
    <SelectField
      label="Showing"
      value={ward.student_id}
      options={wards.map((w) => ({ value: w.student_id, label: `${w.full_name}${w.roll_number ? ` (Roll ${w.roll_number})` : ''}` }))}
      onChange={(v) => select(Number(v))}
    />
  );
}

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function DocumentIdField({ value, onChange }: Props) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-[#d0d0d0]">Document ID</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Paste document ID"
        className="w-full rounded-2xl border border-[#4d4d4d] bg-[#202020] px-4 py-3 text-sm text-white outline-none placeholder:text-[#8a8a8a]"
      />
    </label>
  );
}

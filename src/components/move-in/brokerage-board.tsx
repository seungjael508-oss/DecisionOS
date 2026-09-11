"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { saveBrokerageOffice } from "@/app/projects/[projectId]/move-in/brokerages/actions";
import {
  BROKERAGE_CONTACT_ROLE_LABELS,
  contactNameForRole,
  type BrokerageOfficeOption,
} from "@/lib/move-in/brokerages";

function emptyForm(office?: BrokerageOfficeOption) {
  const contact = (role: "REP" | "MANAGER1" | "MANAGER2") =>
    office?.contacts.find((item) => item.role === role);
  return {
    officeId: office?.id ?? "",
    name: office?.name ?? "",
    address: office?.address ?? "",
    mainPhone: office?.mainPhone ?? "",
    active: office?.active ?? true,
    repName: contact("REP")?.name ?? "",
    repPhone: contact("REP")?.phone ?? "",
    mgr1Name: contact("MANAGER1")?.name ?? "",
    mgr1Phone: contact("MANAGER1")?.phone ?? "",
    mgr2Name: contact("MANAGER2")?.name ?? "",
    mgr2Phone: contact("MANAGER2")?.phone ?? "",
  };
}

export function BrokerageBoard({
  projectId,
  offices,
}: {
  projectId: string;
  offices: BrokerageOfficeOption[];
}) {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await saveBrokerageOffice({
      projectId,
      officeId: form.officeId || null,
      name: form.name,
      address: form.address,
      mainPhone: form.mainPhone,
      active: form.active,
      contacts: [
        { role: "REP", name: form.repName, phone: form.repPhone },
        { role: "MANAGER1", name: form.mgr1Name, phone: form.mgr1Phone },
        { role: "MANAGER2", name: form.mgr2Name, phone: form.mgr2Phone },
      ],
    });
    setPending(false);
    if (!result.ok) {
      setError("중개업소 정보를 저장하지 못했습니다.");
      return;
    }
    setForm(emptyForm());
    router.refresh();
  }

  return (
    <div className="grid gap-8">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-neutral-300">
              <th className="py-2 pr-3 font-medium">업소명</th>
              <th className="py-2 pr-3 font-medium">주소</th>
              <th className="py-2 pr-3 font-medium">대표번호</th>
              <th className="py-2 pr-3 font-medium">대표</th>
              <th className="py-2 pr-3 font-medium">실장1</th>
              <th className="py-2 pr-3 font-medium">실장2</th>
              <th className="py-2 pr-3 font-medium">활성</th>
              <th className="py-2 font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {offices.map((office) => (
              <tr key={office.id} className="border-b border-neutral-200">
                <td className="py-2 pr-3">{office.name}</td>
                <td className="py-2 pr-3">{office.address || "—"}</td>
                <td className="py-2 pr-3">{office.mainPhone || "—"}</td>
                <td className="py-2 pr-3">{contactNameForRole(office, "REP")}</td>
                <td className="py-2 pr-3">
                  {contactNameForRole(office, "MANAGER1")}
                </td>
                <td className="py-2 pr-3">
                  {contactNameForRole(office, "MANAGER2")}
                </td>
                <td className="py-2 pr-3">{office.active ? "활성" : "비활성"}</td>
                <td className="py-2">
                  <button
                    type="button"
                    className="underline"
                    onClick={() => setForm(emptyForm(office))}
                  >
                    수정
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form className="grid max-w-xl gap-3" onSubmit={onSubmit}>
        <h2 className="text-lg font-semibold">
          {form.officeId ? "중개업소 수정" : "중개업소 등록"}
        </h2>
        <label className="flex flex-col gap-1 text-sm">
          업소명
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            className="border border-neutral-400 px-2 py-1"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          주소
          <input
            value={form.address}
            onChange={(event) =>
              setForm({ ...form, address: event.target.value })
            }
            className="border border-neutral-400 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          대표번호
          <input
            value={form.mainPhone}
            onChange={(event) =>
              setForm({ ...form, mainPhone: event.target.value })
            }
            className="border border-neutral-400 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          대표 이름
          <input
            value={form.repName}
            onChange={(event) => setForm({ ...form, repName: event.target.value })}
            className="border border-neutral-400 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          대표 전화
          <input
            value={form.repPhone}
            onChange={(event) =>
              setForm({ ...form, repPhone: event.target.value })
            }
            className="border border-neutral-400 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {BROKERAGE_CONTACT_ROLE_LABELS.MANAGER1} 이름
          <input
            value={form.mgr1Name}
            onChange={(event) =>
              setForm({ ...form, mgr1Name: event.target.value })
            }
            className="border border-neutral-400 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {BROKERAGE_CONTACT_ROLE_LABELS.MANAGER1} 전화
          <input
            value={form.mgr1Phone}
            onChange={(event) =>
              setForm({ ...form, mgr1Phone: event.target.value })
            }
            className="border border-neutral-400 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {BROKERAGE_CONTACT_ROLE_LABELS.MANAGER2} 이름
          <input
            value={form.mgr2Name}
            onChange={(event) =>
              setForm({ ...form, mgr2Name: event.target.value })
            }
            className="border border-neutral-400 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {BROKERAGE_CONTACT_ROLE_LABELS.MANAGER2} 전화
          <input
            value={form.mgr2Phone}
            onChange={(event) =>
              setForm({ ...form, mgr2Phone: event.target.value })
            }
            className="border border-neutral-400 px-2 py-1"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(event) =>
              setForm({ ...form, active: event.target.checked })
            }
          />
          활성
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="w-fit border border-neutral-800 px-3 py-1"
        >
          중개업소 저장
        </button>
      </form>
    </div>
  );
}

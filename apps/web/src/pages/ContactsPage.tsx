import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import { api } from "../api";
import { Card } from "../components/ui/Card";
import { ContactTypeBadge } from "../components/ui/ContactTypeBadge";
import { TableSkeleton } from "../components/skeletons/TableSkeleton";
import {
  SelectRoot as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/Select";
import { formatCurrency } from "../lib/formatCurrency";
import { formatDate } from "../lib/formatDate";
import type { ContactSort } from "../types";

const COLUMNS = [
  { header: "Name", width: "70%" },
  { header: "Type", width: "35%" },
  { header: "Transactions", width: "35%" },
  { header: "Sent / received", width: "45%" },
  { header: "Last interaction", width: "40%" },
];

const SORT_OPTIONS: { value: ContactSort; label: string }[] = [
  { value: "recent", label: "Most recent" },
  { value: "amount", label: "Highest spend" },
  { value: "frequency", label: "Most frequent" },
];

export default function ContactsPage() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [sort, setSort] = useState<ContactSort>("recent");

  const { data, isLoading, error } = useQuery({
    queryKey: ["contacts", "list", sort],
    queryFn: () => api.getContacts(getToken, sort),
  });

  const contacts = data?.contacts ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-100">
            People & places{!isLoading && ` (${contacts.length})`}
          </h1>
          <p className="mt-1 text-sm text-text-400">
            Everyone and everywhere your money has moved through — from bank transfers and
            Spendybot captures alike.
          </p>
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as ContactSort)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="p-0">
        {isLoading && <TableSkeleton columns={COLUMNS} rows={8} />}
        {error && !data && <p className="p-5 text-rust-400">{(error as Error).message}</p>}
        {data && contacts.length === 0 && (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-ink-850 text-text-400">
              <Users className="size-6" strokeWidth={1.6} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-text-100">No contacts yet</h2>
              <p className="mt-1 max-w-sm text-sm text-text-400">
                As statements and Spendybot captures name people, businesses, and places your
                money flows through, they'll show up here.
              </p>
            </div>
          </div>
        )}
        {data && contacts.length > 0 && (
          <div>
            <div
              className="grid border-y border-line px-5 text-left text-xs font-medium uppercase tracking-wide text-text-400"
              style={{ gridTemplateColumns: "1.6fr 130px 130px 160px 140px" }}
            >
              {COLUMNS.map((col) => (
                <div key={col.header} className="py-2.5">
                  {col.header}
                </div>
              ))}
            </div>
            <div>
              {contacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => navigate(`/contacts/${contact.id}`)}
                  className="grid w-full items-center border-b border-line px-5 py-3 text-left text-sm last:border-b-0 hover:bg-ink-850"
                  style={{ gridTemplateColumns: "1.6fr 130px 130px 160px 140px" }}
                >
                  <span className="truncate font-medium text-text-100">{contact.name}</span>
                  <span>
                    <ContactTypeBadge type={contact.type} />
                  </span>
                  <span className="font-mono tabular text-text-400">{contact.transactionCount}</span>
                  <span className="whitespace-nowrap font-mono tabular">
                    <span className="text-rust-400">
                      {formatCurrency(Number(contact.totalDebit), data.primaryCurrency)}
                    </span>
                    {Number(contact.totalCredit) > 0 && (
                      <span className="text-text-400">
                        {" / "}
                        <span className="text-moss-400">
                          {formatCurrency(Number(contact.totalCredit), data.primaryCurrency)}
                        </span>
                      </span>
                    )}
                  </span>
                  <span className="whitespace-nowrap text-text-400">
                    {contact.lastInteractionAt ? formatDate(contact.lastInteractionAt) : "—"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

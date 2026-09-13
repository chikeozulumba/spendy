import { useState } from "react";
import { ContactsAnalyticsTab } from "../components/ContactsAnalyticsTab";
import { ContactsListTab } from "../components/ContactsListTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/Tabs";

export default function ContactsPage() {
  const [count, setCount] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-100">
            People & places{count !== null && ` (${count})`}
          </h1>
          <p className="mt-1 text-sm text-text-400">
            Everyone and everywhere your money has moved through — from bank transfers and
            Spendybot captures alike. Select rows to merge duplicates together.
          </p>
        </div>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-5">
          <ContactsListTab onCountChange={setCount} />
        </TabsContent>
        <TabsContent value="analytics" className="mt-5">
          <ContactsAnalyticsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

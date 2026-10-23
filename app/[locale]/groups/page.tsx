import type { Metadata } from "next";
import { GroupsHome } from "@/components/groups-home";
import { titleFromParams } from "@/lib/i18n/params";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return { title: await titleFromParams(params, "meta.groups") };
}

export default function GroupsPage() {
  return <GroupsHome />;
}

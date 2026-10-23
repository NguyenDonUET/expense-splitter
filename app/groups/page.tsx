import type { Metadata } from "next";
import { GroupsHome } from "@/components/groups-home";

export const metadata: Metadata = { title: "Groups" };

export default function GroupsPage() {
  return <GroupsHome />;
}

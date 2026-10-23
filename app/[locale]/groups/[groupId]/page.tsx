import { GroupDashboard } from "@/components/group-dashboard";

export default async function GroupPage({ params }: { params: Promise<{ locale: string; groupId: string }> }) {
  const { groupId } = await params;
  return <GroupDashboard groupId={groupId} />;
}

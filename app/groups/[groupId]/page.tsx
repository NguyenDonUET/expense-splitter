import { GroupDashboard } from "@/components/group-dashboard";

export default async function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  return <GroupDashboard groupId={groupId} />;
}

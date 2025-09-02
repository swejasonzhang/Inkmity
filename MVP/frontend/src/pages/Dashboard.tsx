import { useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Dashboard: React.FC = () => {
  const { isSignedIn, user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isSignedIn) navigate("/login");
  }, [isSignedIn, navigate]);

  if (!user) return <div>Loading...</div>;

  return (
    <div className="min-h-screen p-6 bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-6">
        Welcome, {user.firstName || user.email}!
      </h1>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Info</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Name: {user.fullName}</p>
                <p>Email: {user.email}</p>
                <p>
                  Created at: {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <p>No activity yet.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Account settings will go here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
import React, { useEffect, useState } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import DashboardCard, { DashboardCardProps } from "../components/DashboardCard";
import Header from "../components/Header";
import { getDashboardData } from "../api/dashboard";

const Dashboard: React.FC = () => {
  const { isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [featuredArtists, setFeaturedArtists] = useState<DashboardCardProps[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSignedIn) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      if (!user) return;

      try {
        const token = await getToken();
        if (!token) return;

        const data = await getDashboardData(token);
        setFeaturedArtists(data.featuredArtists);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isSignedIn, user, getToken]);

  if (!user || loading) return <div className="text-white p-4">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <Header title="Dashboard" userName={user.firstName || "User"} />

      {/* Scrollable main area */}
      <main className="flex-1 overflow-y-auto flex justify-center items-start p-6">
        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <aside className="md:col-span-1 bg-gray-800 p-4 rounded-lg shadow-md text-white">
            <h2 className="font-semibold mb-4 text-lg">Quick Links</h2>
            <ul className="space-y-2">
              <li className="hover:text-blue-400 cursor-pointer">Artists</li>
              <li className="hover:text-blue-400 cursor-pointer">Events</li>
              <li className="hover:text-blue-400 cursor-pointer">Analytics</li>
            </ul>
          </aside>

          {/* Main Content */}
          <section className="md:col-span-3 bg-gray-800 p-6 rounded-lg shadow-md text-white flex flex-col items-center">
            <h1 className="text-3xl font-bold mb-6 text-center">
              Welcome, {user.firstName}
            </h1>

            <h2 className="text-2xl mb-4 text-center">Featured Artists</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
              {featuredArtists.length > 0 ? (
                featuredArtists.map((artist) => (
                  <DashboardCard
                    key={artist.id}
                    id={artist.id}
                    name={artist.name}
                    location={artist.location}
                    style={artist.style}
                    priceRange={artist.priceRange}
                    rating={artist.rating}
                  />
                ))
              ) : (
                <p className="text-gray-400 col-span-full text-center">
                  No featured artists found.
                </p>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

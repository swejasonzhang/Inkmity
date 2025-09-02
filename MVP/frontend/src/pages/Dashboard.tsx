import React, { useEffect, useState } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import DashboardCard, { DashboardCardProps } from "../components/DashboardCard";
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
    <div className="p-4">
      <h1 className="text-3xl font-bold text-white mb-6">
        Welcome, {user.firstName}
      </h1>

      <h2 className="text-2xl text-white mb-4">Featured Artists</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <p className="text-gray-300 col-span-full">
            No featured artists found.
          </p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

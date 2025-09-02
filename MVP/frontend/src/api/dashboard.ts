export interface DashboardArtist {
  id: string;
  name: string;
  location: string;
  style: string;
  priceRange: string;
  rating: number;
}

export const getDashboardData = async (
  token: string
): Promise<{ featuredArtists: DashboardArtist[] }> => {
  try {
    const response = await fetch(
      `${
        import.meta.env.VITE_API_URL || "http://localhost:5000"
      }/api/dashboard`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    throw error;
  }
};
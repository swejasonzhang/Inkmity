import { useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";

const Dashboard: React.FC = () => {
  const { isSignedIn, user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isSignedIn) navigate("/login");
  }, [isSignedIn]);

  if (!user) return <div>Loading...</div>;

  return (
    <div className="h-screen flex items-center justify-center text-white">
      <h1>Welcome to your Dashboard, !</h1>
    </div>
  );
};

export default Dashboard;
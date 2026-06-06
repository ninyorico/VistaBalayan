import { useNavigate } from "react-router";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-blue-600">404</h1>
          <h2 className="text-3xl font-semibold text-gray-900 mt-4">
            Page Not Found
          </h2>
          <p className="text-gray-600 mt-2">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            <Home className="w-5 h-5" />
            Home
          </button>
        </div>
      </div>
    </div>
  );
}

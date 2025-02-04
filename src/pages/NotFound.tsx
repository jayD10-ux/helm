import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <h1 className="text-[200px] font-bold text-foreground leading-none">404</h1>
      <p className="text-3xl text-muted-foreground mb-8">Oops! Page not found</p>
      <Link 
        to="/" 
        className="text-primary hover:text-primary/80 text-lg underline underline-offset-4 transition-colors"
      >
        Return to Home
      </Link>
    </div>
  );
};

export default NotFound;
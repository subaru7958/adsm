import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSeason } from '@/contexts/SeasonContext';

export const SeasonGuard = ({ children }: { children: React.ReactNode }) => {
  const { activeSeasonId } = useSeason();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // If no active season and not on seasons page, redirect
    if (!activeSeasonId && !location.pathname.includes('/seasons')) {
      navigate('/admin/seasons');
    }
  }, [activeSeasonId, location.pathname, navigate]);

  // If no active season, show loading or redirect message
  if (!activeSeasonId && !location.pathname.includes('/seasons')) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">No Active Season</h2>
          <p className="text-muted-foreground">Redirecting to season selection...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

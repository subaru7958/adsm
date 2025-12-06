import React, { createContext, useContext, useState, useEffect } from 'react';

interface Season {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  description?: string;
}

interface SeasonContextType {
  activeSeason: Season | null;
  setActiveSeason: (season: Season | null) => void;
  activeSeasonId: string | null;
  clearActiveSeason: () => void;
}

const SeasonContext = createContext<SeasonContextType | undefined>(undefined);

export const SeasonProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeSeason, setActiveSeasonState] = useState<Season | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  // Load and validate active season from localStorage on mount
  useEffect(() => {
    const validateSavedSeason = async () => {
      const savedSeason = localStorage.getItem('activeSeason');
      if (savedSeason) {
        try {
          const parsed = JSON.parse(savedSeason);
          // Validate that the season still exists in the database
          try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/seasons`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
              }
            });
            if (response.ok) {
              const data = await response.json();
              const seasonExists = data.seasons?.some((s: Season) => s._id === parsed._id);
              if (seasonExists) {
                setActiveSeasonState(parsed);
              } else {
                // Season no longer exists, clear it
                localStorage.removeItem('activeSeason');
              }
            } else {
              // Can't validate, clear it to be safe
              localStorage.removeItem('activeSeason');
            }
          } catch (err) {
            // Network error or not logged in, clear the season
            localStorage.removeItem('activeSeason');
          }
        } catch (e) {
          console.error('Failed to parse saved season');
          localStorage.removeItem('activeSeason');
        }
      }
      setIsValidating(false);
    };

    validateSavedSeason();
  }, []);

  const setActiveSeason = (season: Season | null) => {
    setActiveSeasonState(season);
    if (season) {
      localStorage.setItem('activeSeason', JSON.stringify(season));
    } else {
      localStorage.removeItem('activeSeason');
    }
  };

  const clearActiveSeason = () => {
    setActiveSeasonState(null);
    localStorage.removeItem('activeSeason');
  };

  const activeSeasonId = activeSeason?._id || null;

  return (
    <SeasonContext.Provider value={{ activeSeason, setActiveSeason, activeSeasonId, clearActiveSeason }}>
      {isValidating ? (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      ) : (
        children
      )}
    </SeasonContext.Provider>
  );
};

export const useSeason = () => {
  const context = useContext(SeasonContext);
  if (context === undefined) {
    throw new Error('useSeason must be used within a SeasonProvider');
  }
  return context;
};

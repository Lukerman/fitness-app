
import React, { useState, useCallback } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { getQuickTip } from '../../services/geminiService';
import { Lightbulb } from 'lucide-react';

const Dashboard: React.FC = () => {
  const [tip, setTip] = useState<string>('');
  const [isLoadingTip, setIsLoadingTip] = useState<boolean>(false);

  const handleGetTip = useCallback(async () => {
    setIsLoadingTip(true);
    const newTip = await getQuickTip();
    setTip(newTip);
    setIsLoadingTip(false);
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-on-surface">Welcome Back!</h1>
        <p className="text-md text-on-surface-variant">Here's your fitness snapshot for today.</p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="flex flex-col justify-center items-center">
          <h3 className="text-lg font-semibold text-on-surface-variant">Calories</h3>
          <p className="text-4xl font-bold text-primary">1,250</p>
          <p className="text-sm text-on-surface-variant">/ 2,000 kcal</p>
        </Card>
        <Card className="flex flex-col justify-center items-center">
           <h3 className="text-lg font-semibold text-on-surface-variant">Workout</h3>
          <p className="text-4xl font-bold text-primary">45</p>
          <p className="text-sm text-on-surface-variant">minutes</p>
        </Card>
        <Card className="flex flex-col justify-center items-center">
           <h3 className="text-lg font-semibold text-on-surface-variant">Water</h3>
          <p className="text-4xl font-bold text-primary">6</p>
          <p className="text-sm text-on-surface-variant">/ 8 glasses</p>
        </Card>
      </div>

      <Card>
        <div className="flex items-center mb-2">
            <Lightbulb className="text-primary mr-2" />
            <h2 className="text-xl font-bold">Quick Tip of the Day</h2>
        </div>
        <p className="text-on-surface-variant mb-4 min-h-[40px]">
          {tip || "Click the button to get a quick fitness or nutrition tip!"}
        </p>
        <Button onClick={handleGetTip} isLoading={isLoadingTip} disabled={isLoadingTip}>
          Get New Tip
        </Button>
      </Card>

    </div>
  );
};

export default Dashboard;

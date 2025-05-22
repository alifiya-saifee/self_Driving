
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { LanePosition, isLeftLane, isCenteredLane, isRightLane } from "@/utils/lanePositionTypes";
import { useDetection } from "@/context/DetectionContext";

const LanePositionIndicator = () => {
  const { laneData } = useDetection();
  const { position, idealPosition, score, deviation } = laneData;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Lane Position</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className={`p-2 rounded-lg flex items-center justify-center border ${
            isLeftLane(position as LanePosition) ? 'bg-accent border-accent-foreground' : 'bg-muted border-transparent'
          }`}>
            <ChevronLeft className="h-6 w-6" />
            <span>Left</span>
          </div>
          <div className={`p-2 rounded-lg flex items-center justify-center border ${
            isCenteredLane(position as LanePosition) ? 'bg-accent border-accent-foreground' : 'bg-muted border-transparent'
          }`}>
            <span>Center</span>
          </div>
          <div className={`p-2 rounded-lg flex items-center justify-center border ${
            isRightLane(position as LanePosition) ? 'bg-accent border-accent-foreground' : 'bg-muted border-transparent'
          }`}>
            <span>Right</span>
            <ChevronRight className="h-6 w-6" />
          </div>
        </div>
        
        {/* Lane deviation indicator */}
        <div className="mb-4">
          <p className="text-sm font-medium mb-1">Lane Centering:</p>
          <div className="h-4 bg-muted rounded-full relative overflow-hidden">
            <div 
              className="absolute h-full bg-primary w-2" 
              style={{ 
                left: `calc(50% + ${deviation * 3}%)`,
                transform: 'translateX(-50%)'
              }}
            ></div>
            {/* Lane markers */}
            <div className="absolute left-0 right-0 top-0 bottom-0 flex justify-between px-4">
              <div className="h-full w-px bg-muted-foreground/30"></div>
              <div className="h-full w-px bg-muted-foreground/30"></div>
              <div className="h-full w-px bg-muted-foreground/30"></div>
            </div>
          </div>
        </div>
        
        {position !== idealPosition && (
          <div className="bg-muted p-3 rounded-lg mb-4">
            <p className="text-sm font-medium mb-2">Suggested Lane Change:</p>
            <div className="flex items-center justify-center gap-4">
              {isLeftLane(idealPosition as LanePosition) && !isLeftLane(position as LanePosition) && (
                <div className="flex items-center text-primary">
                  <ArrowLeft className="mr-1 h-5 w-5" />
                  <span>Move Left</span>
                </div>
              )}
              
              {isRightLane(idealPosition as LanePosition) && !isRightLane(position as LanePosition) && (
                <div className="flex items-center text-primary">
                  <span>Move Right</span>
                  <ArrowRight className="ml-1 h-5 w-5" />
                </div>
              )}
              
              {isCenteredLane(idealPosition as LanePosition) && !isCenteredLane(position as LanePosition) && (
                <div className="flex items-center text-primary">
                  <span>Move to Center Lane</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="flex flex-col items-center">
          <div className="w-full bg-muted rounded-full h-2.5 mb-1">
            <div 
              className="bg-primary h-2.5 rounded-full" 
              style={{ width: `${score}%` }}
            ></div>
          </div>
          <span className="text-xs text-muted-foreground">
            Lane Discipline Score: {score}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default LanePositionIndicator;

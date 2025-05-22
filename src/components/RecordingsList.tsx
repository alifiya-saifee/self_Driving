
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Download } from "lucide-react";

interface RecordingItem {
  id: string;
  name: string;
  date: string;
  duration: string;
  url: string;
}

const RecordingsList = () => {
  // Sample recordings data - in a real app this would come from storage
  const [recordings] = useState<RecordingItem[]>([
    {
      id: "rec-1",
      name: "Critical Proximity Event",
      date: "Today, 14:32",
      duration: "0:42",
      url: "#"
    },
    {
      id: "rec-2",
      name: "Pedestrian Detection",
      date: "Today, 11:15",
      duration: "1:17",
      url: "#"
    },
    {
      id: "rec-3",
      name: "Lane Departure",
      date: "Yesterday, 16:08",
      duration: "0:23",
      url: "#"
    }
  ]);
  
  const [selectedRecording, setSelectedRecording] = useState<RecordingItem | null>(null);
  
  const handleSelectRecording = (recording: RecordingItem) => {
    setSelectedRecording(recording);
  };

  return (
    <Card className="dashboard-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Saved Recordings</CardTitle>
      </CardHeader>
      <CardContent>
        {selectedRecording ? (
          <div>
            <div className="bg-muted h-32 rounded-md flex items-center justify-center mb-2">
              <p className="text-muted-foreground text-sm">Video Player: {selectedRecording.name}</p>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-medium">{selectedRecording.name}</h4>
                <p className="text-sm text-muted-foreground">{selectedRecording.date} • {selectedRecording.duration}</p>
              </div>
              <div className="space-x-2">
                <Button size="icon" variant="outline">
                  <Download size={16} />
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedRecording(null)}>
                  Back to List
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {recordings.map(recording => (
              <div 
                key={recording.id} 
                className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer"
                onClick={() => handleSelectRecording(recording)}
              >
                <div>
                  <p className="font-medium">{recording.name}</p>
                  <p className="text-xs text-muted-foreground">{recording.date} • {recording.duration}</p>
                </div>
                <Button size="icon" variant="ghost">
                  <Play size={16} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecordingsList;

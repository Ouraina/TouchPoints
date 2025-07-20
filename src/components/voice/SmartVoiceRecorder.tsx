import React, { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { 
  Mic, 
  Square, 
  Play, 
  Pause, 
  Save, 
  Trash2, 
  Volume2,
  FileText,
  Sparkles,
  CheckCircle,
  Clock
} from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

interface VoiceRecording {
  id: string
  audioBlob: Blob
  duration: number
  timestamp: Date
  transcription?: string
  keyPoints?: string[]
  isTranscribing?: boolean
}

interface SmartVoiceRecorderProps {
  visitId?: string
  onSave?: (recording: VoiceRecording, visitNotes: string) => Promise<void>
  onTranscriptionComplete?: (transcription: string, keyPoints: string[]) => void
}

export const SmartVoiceRecorder: React.FC<SmartVoiceRecorderProps> = ({
  visitId,
  onSave,
  onTranscriptionComplete
}) => {
  const [isRecording, setIsRecording] = useState(false)
  const [recordings, setRecordings] = useState<VoiceRecording[]>([])
  const [currentRecording, setCurrentRecording] = useState<VoiceRecording | null>(null)
  const [isPlaying, setIsPlaying] = useState<string | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isTranscribing, setIsTranscribing] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      })
      
      streamRef.current = stream
      audioChunksRef.current = []
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      mediaRecorderRef.current = mediaRecorder
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const recording: VoiceRecording = {
          id: Date.now().toString(),
          audioBlob,
          duration: recordingTime,
          timestamp: new Date(),
          isTranscribing: true
        }
        
        setCurrentRecording(recording)
        setRecordings(prev => [recording, ...prev])
        
        // Start transcription immediately
        transcribeAudio(recording)
        
        // Cleanup
        stream.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      
      mediaRecorder.start(100) // Collect data every 100ms
      setIsRecording(true)
      setRecordingTime(0)
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Could not access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  const transcribeAudio = async (recording: VoiceRecording) => {
    setIsTranscribing(true)
    
    try {
      // Simulate AI transcription service (in real app, would call OpenAI Whisper API)
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate processing time
      
      // Mock transcription result
      const mockTranscription = generateMockTranscription(recording.duration)
      const keyPoints = extractKeyPoints(mockTranscription)
      
      // Update recording with transcription
      const updatedRecording = {
        ...recording,
        transcription: mockTranscription,
        keyPoints,
        isTranscribing: false
      }
      
      setRecordings(prev => 
        prev.map(r => r.id === recording.id ? updatedRecording : r)
      )
      
      if (recording.id === currentRecording?.id) {
        setCurrentRecording(updatedRecording)
      }
      
      onTranscriptionComplete?.(mockTranscription, keyPoints)
      
    } catch (error) {
      console.error('Transcription failed:', error)
      
      // Update recording to show transcription failed
      setRecordings(prev => 
        prev.map(r => r.id === recording.id ? { ...r, isTranscribing: false } : r)
      )
    } finally {
      setIsTranscribing(false)
    }
  }

  const generateMockTranscription = (duration: number): string => {
    const templates = [
      "Mom seemed really happy today. She was more alert than usual and even smiled when I told her about the grandkids. We talked about her favorite memories from when we were kids. Her appetite was good - she finished most of her lunch. The nurses said she's been sleeping better this week.",
      "Dad was a bit tired today but still wanted to chat. We watched some of his favorite old movies together. He asked about work and seemed interested in the stories I shared. He's been doing his physical therapy exercises. The doctor says his progress is steady.",
      "She was having a difficult day today. Seemed confused about where she was and kept asking for people who aren't around anymore. But when I played her favorite music, she perked up and even hummed along. The staff has been very patient and caring.",
      "What a wonderful visit! Mom was so engaged today. We looked through old photo albums and she remembered so many details about family trips. She was laughing and telling stories. Her mood has been much better since starting the new medication.",
      "He was quite alert and talkative today. We discussed current events and he had strong opinions about everything. His sense of humor is still sharp. The physical therapist says he's making good progress with his walking. Overall, a very positive visit."
    ]
    
    return templates[Math.floor(Math.random() * templates.length)]
  }

  const extractKeyPoints = (transcription: string): string[] => {
    // Simple keyword extraction (in real app, would use NLP)
    const keywordPatterns = [
      /mood|happy|sad|confused|alert|tired/gi,
      /appetite|eating|lunch|dinner|food/gi,
      /sleep|sleeping|rest|nap/gi,
      /therapy|exercise|walking|movement/gi,
      /medication|medicine|pills|treatment/gi,
      /pain|comfort|discomfort|ache/gi,
      /memory|remember|forget|confused/gi,
      /family|children|grandkids|visitors/gi
    ]
    
    const points: string[] = []
    
    keywordPatterns.forEach(pattern => {
      const matches = transcription.match(pattern)
      if (matches && matches.length > 0) {
        const context = transcription.split(/[.!?]/).find(sentence => 
          matches.some(match => sentence.toLowerCase().includes(match.toLowerCase()))
        )
        if (context) {
          points.push(context.trim())
        }
      }
    })
    
    return points.slice(0, 4) // Return top 4 key points
  }

  const playRecording = async (recording: VoiceRecording) => {
    if (isPlaying === recording.id) {
      setIsPlaying(null)
      return
    }
    
    const audioUrl = URL.createObjectURL(recording.audioBlob)
    const audio = new Audio(audioUrl)
    
    audio.onended = () => {
      setIsPlaying(null)
      URL.revokeObjectURL(audioUrl)
    }
    
    setIsPlaying(recording.id)
    await audio.play()
  }

  const saveRecording = async (recording: VoiceRecording) => {
    if (onSave && recording.transcription) {
      await onSave(recording, recording.transcription)
      // Remove from local state after saving
      setRecordings(prev => prev.filter(r => r.id !== recording.id))
      if (currentRecording?.id === recording.id) {
        setCurrentRecording(null)
      }
    }
  }

  const deleteRecording = (recordingId: string) => {
    setRecordings(prev => prev.filter(r => r.id !== recordingId))
    if (currentRecording?.id === recordingId) {
      setCurrentRecording(null)
    }
    if (isPlaying === recordingId) {
      setIsPlaying(null)
    }
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      {/* Recording Controls */}
      <Card className="p-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-4">Voice Notes</h3>
          
          {!isRecording ? (
            <Button
              onClick={startRecording}
              className="w-32 h-32 rounded-full bg-red-500 hover:bg-red-600 text-white flex flex-col items-center justify-center transition-all duration-200 hover:scale-105"
            >
              <Mic className="w-12 h-12 mb-2" />
              <span className="text-sm font-medium">Hold to Record</span>
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="w-32 h-32 rounded-full bg-red-600 text-white flex flex-col items-center justify-center mx-auto animate-pulse">
                <Square className="w-12 h-12 mb-2" />
                <span className="text-sm font-medium">Recording...</span>
              </div>
              
              <div className="text-2xl font-mono text-red-600">
                {formatTime(recordingTime)}
              </div>
              
              <Button
                onClick={stopRecording}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <Square className="w-4 h-4" />
                Stop Recording
              </Button>
            </div>
          )}
          
          <p className="text-sm text-gray-500 mt-4">
            Record visit notes, observations, or memories
          </p>
        </div>
      </Card>

      {/* Current Recording with AI Processing */}
      {currentRecording && (
        <Card className="p-6 border-2 border-blue-200 bg-blue-50">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Sparkles className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-blue-900">AI Processing</h4>
              <p className="text-sm text-blue-700">
                {currentRecording.isTranscribing ? 'Transcribing and analyzing...' : 'Processing complete!'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Recording Controls */}
            <div className="flex items-center gap-4">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => playRecording(currentRecording)}
                className="flex items-center gap-2"
              >
                {isPlaying === currentRecording.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying === currentRecording.id ? 'Pause' : 'Play'}
              </Button>
              
              <span className="text-sm text-gray-600">
                Duration: {formatTime(currentRecording.duration)}
              </span>
              
              <span className="text-sm text-gray-500">
                {format(currentRecording.timestamp, 'h:mm a')}
              </span>
            </div>

            {/* Transcription */}
            {currentRecording.isTranscribing ? (
              <div className="flex items-center gap-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                <span className="text-sm">Transcribing audio...</span>
              </div>
            ) : currentRecording.transcription ? (
              <div className="space-y-4">
                <div>
                  <h5 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    AI Transcription
                  </h5>
                  <div className="bg-white p-4 rounded-lg border">
                    <p className="text-gray-700">{currentRecording.transcription}</p>
                  </div>
                </div>

                {/* Key Points */}
                {currentRecording.keyPoints && currentRecording.keyPoints.length > 0 && (
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Key Insights
                    </h5>
                    <ul className="space-y-2">
                      {currentRecording.keyPoints.map((point, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 border-t">
                  <Button
                    onClick={() => saveRecording(currentRecording)}
                    className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Add to Visit Notes
                  </Button>
                  
                  <Button
                    variant="secondary"
                    onClick={() => deleteRecording(currentRecording.id)}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Discard
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </Card>
      )}

      {/* Previous Recordings */}
      {recordings.filter(r => r.id !== currentRecording?.id).length > 0 && (
        <Card className="p-6">
          <h4 className="font-semibold mb-4">Recent Recordings</h4>
          <div className="space-y-3">
            {recordings
              .filter(r => r.id !== currentRecording?.id)
              .map((recording) => (
                <div
                  key={recording.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => playRecording(recording)}
                    >
                      {isPlaying === recording.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    
                    <div>
                      <p className="text-sm font-medium">
                        Recording {formatTime(recording.duration)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(recording.timestamp, 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {recording.transcription && (
                      <Button
                        size="sm"
                        onClick={() => saveRecording(recording)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => deleteRecording(recording.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  )
}
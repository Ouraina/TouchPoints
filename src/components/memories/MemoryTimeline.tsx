import React, { useState, useEffect } from 'react'
import { format, isToday, isYesterday, differenceInDays } from 'date-fns'
import { 
  Camera, 
  Heart, 
  Smile, 
  Meh, 
  Frown, 
  AlertTriangle,
  Plus,
  Play,
  Download,
  Share,
  Eye,
  Upload,
  X
} from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import type { Visit, VisitAttachment } from '../../types'

interface Memory {
  id: string
  date: string
  visitId: string
  visitorName: string
  mood?: 'great' | 'good' | 'okay' | 'difficult' | 'concerning'
  notes?: string
  photos: VisitAttachment[]
  voiceNotes: VisitAttachment[]
  created_at: string
}

interface MemoryTimelineProps {
  visits: Visit[]
  patientName: string
  onUploadPhoto?: (visitId: string, file: File) => Promise<void>
  onViewPhoto?: (photo: VisitAttachment) => void
}

export const MemoryTimeline: React.FC<MemoryTimelineProps> = ({
  visits,
  patientName,
  onUploadPhoto,
  onViewPhoto
}) => {
  const [memories, setMemories] = useState<Memory[]>([])
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  const [photoUploadVisitId, setPhotoUploadVisitId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    generateMemories()
  }, [visits])

  const generateMemories = () => {
    // Transform visits into memories with photos/attachments
    const memoryData: Memory[] = visits
      .filter(visit => visit.status === 'completed')
      .map(visit => ({
        id: visit.id,
        date: visit.visit_date,
        visitId: visit.id,
        visitorName: visit.visitor?.full_name || 'Unknown',
        mood: visit.mood,
        notes: visit.notes,
        photos: [], // Would be loaded from visit_attachments table
        voiceNotes: [], // Would be loaded from visit_attachments table
        created_at: visit.created_at
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    setMemories(memoryData)
  }

  const getMoodIcon = (mood?: string) => {
    switch (mood) {
      case 'great': return <Heart className="w-5 h-5 text-red-500" />
      case 'good': return <Smile className="w-5 h-5 text-green-500" />
      case 'okay': return <Meh className="w-5 h-5 text-yellow-500" />
      case 'difficult': return <Frown className="w-5 h-5 text-orange-500" />
      case 'concerning': return <AlertTriangle className="w-5 h-5 text-red-600" />
      default: return null
    }
  }

  const getMoodColor = (mood?: string) => {
    switch (mood) {
      case 'great': return 'border-red-200 bg-red-50'
      case 'good': return 'border-green-200 bg-green-50'
      case 'okay': return 'border-yellow-200 bg-yellow-50'
      case 'difficult': return 'border-orange-200 bg-orange-50'
      case 'concerning': return 'border-red-300 bg-red-100'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

  const formatMemoryDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    
    if (isToday(date)) {
      return 'Today'
    } else if (isYesterday(date)) {
      return 'Yesterday'
    } else {
      const days = differenceInDays(today, date)
      if (days < 7) {
        return `${days} days ago`
      } else {
        return format(date, 'MMM d, yyyy')
      }
    }
  }

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !photoUploadVisitId || !onUploadPhoto) return

    setIsUploading(true)
    try {
      await onUploadPhoto(photoUploadVisitId, file)
      // Refresh memories after upload
      generateMemories()
    } catch (error) {
      console.error('Error uploading photo:', error)
    } finally {
      setIsUploading(false)
      setPhotoUploadVisitId(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {patientName}'s Memory Timeline
        </h2>
        <p className="text-gray-600">
          Precious moments and memories from family visits
        </p>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 to-purple-500"></div>

        <div className="space-y-8">
          {memories.map((memory, index) => (
            <div key={memory.id} className="relative flex items-start gap-6">
              {/* Timeline Dot */}
              <div className="relative z-10 flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-white border-4 border-blue-500 flex items-center justify-center shadow-lg">
                  {getMoodIcon(memory.mood) || <Heart className="w-6 h-6 text-gray-400" />}
                </div>
              </div>

              {/* Memory Card */}
              <Card className={`flex-1 ${getMoodColor(memory.mood)} border-2`}>
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Visit with {memory.visitorName}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {formatMemoryDate(memory.date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {memory.mood && (
                        <div className="flex items-center gap-1">
                          {getMoodIcon(memory.mood)}
                          <span className="text-sm capitalize text-gray-700">
                            {memory.mood}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  {memory.notes && (
                    <div className="mb-4">
                      <p className="text-gray-700 italic">
                        "{memory.notes}"
                      </p>
                    </div>
                  )}

                  {/* Photo Grid */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">Visit Memories</h4>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setPhotoUploadVisitId(memory.visitId)}
                        className="flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Photo
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {/* Existing Photos */}
                      {memory.photos.map((photo) => (
                        <div
                          key={photo.id}
                          className="relative group cursor-pointer rounded-lg overflow-hidden bg-gray-100 aspect-square"
                          onClick={() => onViewPhoto?.(photo)}
                        >
                          <img
                            src={photo.storage_path}
                            alt={photo.alt_text || 'Visit photo'}
                            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-200 flex items-center justify-center">
                            <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                          </div>
                          {photo.caption && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-2">
                              {photo.caption}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Upload Placeholder */}
                      {memory.photos.length === 0 && (
                        <div
                          className="border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors aspect-square"
                          onClick={() => setPhotoUploadVisitId(memory.visitId)}
                        >
                          <div className="text-center">
                            <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-xs text-gray-500">Add photos</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Voice Notes */}
                  {memory.voiceNotes.length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium text-gray-900 mb-3">Voice Notes</h4>
                      <div className="space-y-2">
                        {memory.voiceNotes.map((note) => (
                          <div
                            key={note.id}
                            className="flex items-center gap-3 p-3 bg-white rounded-lg border"
                          >
                            <Button size="sm" variant="secondary">
                              <Play className="w-4 h-4" />
                            </Button>
                            <div className="flex-1">
                              <p className="text-sm font-medium">Voice Note</p>
                              <p className="text-xs text-gray-500">
                                {note.duration_seconds ? `${Math.round(note.duration_seconds / 60)}:${(note.duration_seconds % 60).toString().padStart(2, '0')}` : 'Unknown duration'}
                              </p>
                            </div>
                            <Button size="sm" variant="secondary">
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex items-center gap-2"
                    >
                      <Share className="w-4 h-4" />
                      Share
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setSelectedMemory(memory)}
                      className="flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          ))}

          {/* Empty State */}
          {memories.length === 0 && (
            <div className="text-center py-12">
              <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No memories yet</h3>
              <p className="text-gray-600 mb-6">
                Start adding photos and notes to visits to create beautiful memories
              </p>
              <Button className="bg-blue-600 hover:bg-blue-700">
                Schedule First Visit
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Photo Upload Modal */}
      {photoUploadVisitId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Add Photo</h3>
                <button
                  onClick={() => setPhotoUploadVisitId(null)}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Photo
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    disabled={isUploading}
                  />
                </div>

                {isUploading && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                    <span className="text-sm">Uploading...</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Memory Detail Modal */}
      {selectedMemory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">
                  Visit with {selectedMemory.visitorName}
                </h3>
                <button
                  onClick={() => setSelectedMemory(null)}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {getMoodIcon(selectedMemory.mood)}
                    <span className="capitalize">{selectedMemory.mood}</span>
                  </div>
                  <span className="text-gray-500">
                    {formatMemoryDate(selectedMemory.date)}
                  </span>
                </div>

                {selectedMemory.notes && (
                  <div>
                    <h4 className="font-medium mb-2">Visit Notes</h4>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                      {selectedMemory.notes}
                    </p>
                  </div>
                )}

                {selectedMemory.photos.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Photos</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedMemory.photos.map((photo) => (
                        <img
                          key={photo.id}
                          src={photo.storage_path}
                          alt={photo.alt_text || 'Visit photo'}
                          className="w-full rounded-lg"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
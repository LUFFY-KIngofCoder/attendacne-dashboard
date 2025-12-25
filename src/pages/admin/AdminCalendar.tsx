import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Holiday, Event } from '../../types';
import { SectionCard } from '../../components/Card';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Edit2, Trash2 } from 'lucide-react';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import { useAuth } from '../../contexts/AuthContext';

type ModalMode = 'holiday' | 'event' | null;

export default function AdminCalendar() {
  const { profile } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [holidayForm, setHolidayForm] = useState({
    is_holiday: false,
    name: '',
    description: '',
  });
  const [eventForm, setEventForm] = useState({
    name: '',
    description: '',
  });
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  useEffect(() => {
    loadHolidays();
    loadEvents();
  }, [currentDate]);

  const loadHolidays = async () => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .gte('date', `${year}-${String(month + 1).padStart(2, '0')}-01`)
        .lte('date', `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`)
        .order('date', { ascending: true });

      if (error) throw error;
      setHolidays(data || []);
    } catch (error) {
      console.error('Error loading holidays:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('date', `${year}-${String(month + 1).padStart(2, '0')}-01`)
        .lte('date', `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`)
        .order('date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const getHolidayForDate = (day: number): Holiday | undefined => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return holidays.find((h) => h.date === dateStr && h.is_holiday);
  };

  const getEventsForDate = (day: number): Event[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter((e) => e.date === dateStr);
  };

  const isWeekend = (day: number): boolean => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0; // Sunday only
  };

  const handleDateClick = (day: number) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const existingHoliday = getHolidayForDate(day);
    const isWeekendDay = isWeekend(day);
    
    setSelectedDate(dateStr);
    setHolidayForm({
      is_holiday: existingHoliday ? true : (isWeekendDay && !holidays.find(h => h.date === dateStr && !h.is_holiday)),
      name: existingHoliday?.name || '',
      description: existingHoliday?.description || '',
    });
    setEventForm({
      name: '',
      description: '',
    });
    setEditingEvent(null);
    setModalMode(null);
    setIsModalOpen(true);
  };

  const handleSaveHoliday = async () => {
    if (!selectedDate) return;

    try {
      const existingHoliday = holidays.find((h) => h.date === selectedDate);
      const isWeekendDay = isWeekend(parseInt(selectedDate.split('-')[2]));

      if (holidayForm.is_holiday) {
        // Mark as holiday
        const defaultName = isWeekendDay 
          ? (new Date(selectedDate).getDay() === 0 ? 'Sunday' : 'Saturday')
          : null;

        if (existingHoliday) {
          const { error } = await supabase
            .from('holidays')
            .update({
              is_holiday: true,
              name: holidayForm.name || defaultName,
              description: holidayForm.description || null,
            })
            .eq('id', existingHoliday.id);

          if (error) throw error;
        } else {
          const { error } = await supabase.from('holidays').insert({
            date: selectedDate,
            is_holiday: true,
            name: holidayForm.name || defaultName,
            description: holidayForm.description || null,
          });

          if (error) throw error;
        }
      } else {
        // Mark as working day (set is_holiday = false or delete)
        if (existingHoliday) {
          // Always update to set is_holiday = false (works for both weekends and weekdays)
          const { error } = await supabase
            .from('holidays')
            .update({
              is_holiday: false,
              name: null,
              description: null,
            })
            .eq('id', existingHoliday.id);

          if (error) throw error;
        } else {
          // Create record with is_holiday = false for weekends (to override default)
          if (isWeekendDay) {
            const { error } = await supabase.from('holidays').insert({
              date: selectedDate,
              is_holiday: false,
              name: null,
              description: null,
            });

            if (error) throw error;
          }
        }
      }

      setIsModalOpen(false);
      setSelectedDate(null);
      setModalMode(null);
      loadHolidays();
    } catch (error) {
      console.error('Error saving holiday:', error);
      alert('Error saving holiday. Please try again.');
    }
  };

  const handleSaveEvent = async () => {
    if (!selectedDate || !eventForm.name.trim()) {
      alert('Event name is required');
      return;
    }

    try {
      if (editingEvent) {
        // Update existing event
        const { error } = await supabase
          .from('events')
          .update({
            name: eventForm.name,
            description: eventForm.description || null,
          })
          .eq('id', editingEvent.id);

        if (error) throw error;
      } else {
        // Create new event
        const { error } = await supabase.from('events').insert({
          date: selectedDate,
          name: eventForm.name,
          description: eventForm.description || null,
          created_by: profile?.id || null,
        });

        if (error) throw error;
      }

      setEventForm({ name: '', description: '' });
      setEditingEvent(null);
      loadEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Error saving event. Please try again.');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const { error } = await supabase.from('events').delete().eq('id', eventId);

      if (error) throw error;
      loadEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Error deleting event. Please try again.');
    }
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setEventForm({
      name: event.name,
      description: event.description || '',
    });
    setModalMode('event');
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: startingDayOfWeek }, (_, i) => i);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <SectionCard>
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-6 w-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={previousMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Click on any date to mark it as a holiday or add events. Changes apply to all employees.
          </p>

          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {emptyDays.map((_, index) => (
              <div key={`empty-${index}`} className="aspect-square" />
            ))}
            {days.map((day) => {
              const year = currentDate.getFullYear();
              const month = currentDate.getMonth();
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const holiday = getHolidayForDate(day);
              const dateEvents = getEventsForDate(day);
              const isWeekendDay = isWeekend(day);
              // Check if there's an explicit override in DB
              const explicitOverride = holidays.find(h => h.date === dateStr);
              const isHoliday = explicitOverride 
                            ? explicitOverride.is_holiday 
                            : (isWeekendDay); // Default: Sundays are holidays
              const displayHoliday = explicitOverride && explicitOverride.is_holiday 
                ? explicitOverride 
                : (isWeekendDay && !explicitOverride 
                  ? { name: (new Date(dateStr).getDay() === 0 ? 'Sunday' : 'Saturday') } 
                  : null);
              const isToday =
                day === new Date().getDate() &&
                currentDate.getMonth() === new Date().getMonth() &&
                currentDate.getFullYear() === new Date().getFullYear();

              return (
                <button
                  key={day}
                  onClick={() => handleDateClick(day)}
                  className={`aspect-square border rounded-lg p-2 flex flex-col items-center justify-center transition-all cursor-pointer ${
                    isToday
                      ? 'border-blue-600 border-2 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                  } ${
                    isHoliday
                      ? 'bg-red-50 border-red-300'
                      : dateEvents.length > 0
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-white'
                  }`}
                >
                  <div className="text-sm font-medium text-gray-900 mb-1">{day}</div>
                  {isHoliday && displayHoliday && (
                    <div className="flex flex-col items-center mb-1">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      {displayHoliday.name && (
                        <div className="text-xs text-red-700 mt-1 truncate w-full text-center">
                          {displayHoliday.name}
                        </div>
                      )}
                    </div>
                  )}
                  {dateEvents.length > 0 && (
                    <div className="flex flex-col items-center space-y-1">
                      {dateEvents.slice(0, 2).map((event) => (
                        <div key={event.id} className="w-full">
                          <div className="w-3 h-3 rounded-full bg-blue-500 mx-auto" />
                          <div className="text-xs text-blue-700 mt-1 truncate w-full text-center font-medium">
                            {event.name}
                          </div>
                        </div>
                      ))}
                      {dateEvents.length > 2 && (
                        <div className="text-xs text-blue-600 font-medium">+{dateEvents.length - 2}</div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-white border-2 border-gray-300" />
              <span className="text-sm text-gray-600">Working Day</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-blue-600" />
              <span className="text-sm text-gray-600">Today</span>
            </div>
          </div>
        </div>
      </SectionCard>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedDate(null);
          setModalMode(null);
          setEditingEvent(null);
        }}
        title={`Manage Date: ${selectedDate ? new Date(selectedDate).toLocaleDateString() : ''}`}
        size="lg"
      >
        <div className="space-y-6">
          {/* Mode Selection */}
          {!modalMode && (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setModalMode('holiday')}
                className="p-6 border-2 border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-all text-left"
              >
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-4 h-4 rounded-full bg-red-500" />
                  <h3 className="font-semibold text-gray-900">Mark as Holiday</h3>
                </div>
                <p className="text-sm text-gray-600">Set this date as a holiday for all employees</p>
              </button>
              <button
                onClick={() => setModalMode('event')}
                className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
              >
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-4 h-4 rounded-full bg-blue-500" />
                  <h3 className="font-semibold text-gray-900">Add Event</h3>
                </div>
                <p className="text-sm text-gray-600">Add an event or deadline for this date</p>
              </button>
            </div>
          )}

          {/* Holiday Form */}
          {modalMode === 'holiday' && (
            <div className="space-y-4">
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={holidayForm.is_holiday}
                    onChange={(e) => setHolidayForm({ ...holidayForm, is_holiday: e.target.checked })}
                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Mark as Holiday</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  {holidayForm.is_holiday ? 'This date will be marked as a holiday (red tag)' : 'This date will be a working day'}
                </p>
              </div>

              {holidayForm.is_holiday && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Holiday Name (Optional)</label>
                    <input
                      type="text"
                      value={holidayForm.name}
                      onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                      placeholder="e.g., New Year, Christmas"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                    <textarea
                      value={holidayForm.description}
                      onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })}
                      placeholder="Additional details about this holiday"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button variant="secondary" onClick={() => setModalMode(null)}>
                  Back
                </Button>
                <Button variant="primary" onClick={handleSaveHoliday}>
                  Save
                </Button>
              </div>
            </div>
          )}

          {/* Event Form */}
          {modalMode === 'event' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Name *</label>
                <input
                  type="text"
                  value={eventForm.name}
                  onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                  placeholder="e.g., Project Deadline, Team Meeting"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  placeholder="Additional details about this event"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button variant="secondary" onClick={() => {
                  setModalMode(null);
                  setEventForm({ name: '', description: '' });
                  setEditingEvent(null);
                }}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleSaveEvent}>
                  {editingEvent ? 'Update Event' : 'Add Event'}
                </Button>
              </div>

              {/* Existing Events List */}
              {selectedDate && getEventsForDate(parseInt(selectedDate.split('-')[2])).length > 0 && (
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Events on this date:</h4>
                  <div className="space-y-2">
                    {getEventsForDate(parseInt(selectedDate.split('-')[2])).map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                      >
                        <div>
                          <div className="font-medium text-blue-900">{event.name}</div>
                          {event.description && (
                            <div className="text-sm text-blue-700 mt-1">{event.description}</div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditEvent(event)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="Edit event"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(event.id)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Delete event"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}

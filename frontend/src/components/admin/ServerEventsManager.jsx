import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff, AlertTriangle, Image, Megaphone, Save, X } from 'lucide-react';
import dashboardAPI from '../../services/dashboardAPI';

const ServerEventsManager = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [formData, setFormData] = useState({
        event_type: 'text',
        title: '',
        content: '',
        image_url: '',
        is_active: true
    });

    // Load events on component mount
    useEffect(() => {
        const adminToken = localStorage.getItem('adminToken');
        if (adminToken) {
            dashboardAPI.setToken(adminToken);
        }
        loadEvents();
    }, []);

    const loadEvents = async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await dashboardAPI.getServerEvents(true);
            if (result.success) {
                setEvents(result.events || []);
            } else {
                setError(result.error || 'Failed to load events');
            }
        } catch (err) {
            console.error('Error loading events:', err);
            setError('Failed to load server events');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateEvent = () => {
        setEditingEvent(null);
        setFormData({
            event_type: 'text',
            title: '',
            content: '',
            image_url: '',
            is_active: true
        });
        setShowModal(true);
    };

    const handleEditEvent = (event) => {
        setEditingEvent(event);
        setFormData({
            event_type: event.event_type,
            title: event.title || '',
            content: event.content || '',
            image_url: event.image_url || '',
            is_active: event.is_active
        });
        setShowModal(true);
    };

    const handleDeleteEvent = async (eventId) => {
        if (!confirm('Are you sure you want to delete this event? This will deactivate it.')) {
            return;
        }

        try {
            const result = await dashboardAPI.deleteServerEvent(eventId);
            if (result.success) {
                await loadEvents(); // Refresh the list
            } else {
                alert('Error deleting event: ' + result.error);
            }
        } catch (err) {
            console.error('Error deleting event:', err);
            alert('Failed to delete event');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            let result;
            if (editingEvent) {
                result = await dashboardAPI.updateServerEvent(editingEvent.id, formData);
            } else {
                result = await dashboardAPI.createServerEvent(formData);
            }

            if (result.success) {
                setShowModal(false);
                await loadEvents(); // Refresh the list
                alert(editingEvent ? 'Event updated successfully!' : 'Event created successfully!');
            } else {
                alert('Error: ' + result.error);
            }
        } catch (err) {
            console.error('Error saving event:', err);
            alert('Failed to save event');
        }
    };

    const getEventTypeIcon = (eventType) => {
        switch (eventType) {
            case 'notification':
                return <AlertTriangle className="w-5 h-5 text-red-500" />;
            case 'picture':
                return <Image className="w-5 h-5 text-blue-500" />;
            default:
                return <Megaphone className="w-5 h-5 text-green-500" />;
        }
    };

    const getEventTypeLabel = (eventType) => {
        switch (eventType) {
            case 'notification':
                return 'Notification';
            case 'picture':
                return 'Picture';
            default:
                return 'Text';
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600">Error: {error}</p>
                <button
                    onClick={loadEvents}
                    className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Server Events Manager</h2>
                    <p className="text-gray-600">Manage dashboard announcements and notifications</p>
                </div>
                <button
                    onClick={handleCreateEvent}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Create Event
                </button>
            </div>

            {/* Events List */}
            <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">Events ({events.length})</h3>
                </div>

                {events.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                        <Megaphone className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>No events created yet. Create your first event to get started!</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {events.map((event) => (
                            <div key={event.id} className="p-6 hover:bg-gray-50">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3 flex-1">
                                        {getEventTypeIcon(event.event_type)}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h4 className="font-semibold text-gray-900 truncate">
                                                    {event.title}
                                                </h4>
                                                {!event.is_active && (
                                                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                                                        Inactive
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                                                {event.content || 'No description'}
                                            </p>
                                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                                <span>{getEventTypeLabel(event.event_type)}</span>
                                                <span>•</span>
                                                <span>Created {new Date(event.created_at).toLocaleDateString()}</span>
                                                {event.updated_at !== event.created_at && (
                                                    <>
                                                        <span>•</span>
                                                        <span>Updated {new Date(event.updated_at).toLocaleDateString()}</span>
                                                    </>
                                                )}
                                            </div>
                                            {event.image_url && (
                                                <div className="mt-2">
                                                    <img
                                                        src={event.image_url}
                                                        alt="Event"
                                                        className="w-20 h-16 object-cover rounded border"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 ml-4">
                                        <button
                                            onClick={() => handleEditEvent(event)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Edit event"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteEvent(event.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete event"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal for Create/Edit */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-gray-800">
                                    {editingEvent ? 'Edit Event' : 'Create New Event'}
                                </h3>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-lg"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Event Type *
                                </label>
                                <select
                                    value={formData.event_type}
                                    onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    required
                                >
                                    <option value="text">Text</option>
                                    <option value="picture">Picture</option>
                                    <option value="notification">Notification</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Title *
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    placeholder="Enter event title"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Content
                                </label>
                                <textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    placeholder="Enter event description (optional)"
                                />
                            </div>

                            {(formData.event_type === 'picture' || formData.event_type === 'text') && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Image URL (optional)
                                    </label>
                                    <input
                                        type="url"
                                        value={formData.image_url}
                                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        placeholder="https://example.com/image.jpg"
                                    />
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                />
                                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                                    Active (visible to users)
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    {editingEvent ? 'Update Event' : 'Create Event'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServerEventsManager;

'use client';

import { useState } from 'react';
import { Card } from './ui/Card';
import { Analytics } from '@/lib/analytics';
import toast from 'react-hot-toast';

interface FeedbackWidgetProps {
  onDismiss?: () => void;
}

export function FeedbackWidget({ onDismiss }: FeedbackWidgetProps) {
  const [rating, setRating] = useState(0);
  const [wouldRecommend, setWouldRecommend] = useState('');
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0 || !wouldRecommend) {
      toast.error('Please select a rating and answer the recommend question.');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, wouldRecommend, comments }),
      });
      if (!response.ok) throw new Error('Failed to submit feedback.');
      Analytics.feedbackSubmitted(rating);
      setSubmitted(true);
      toast.success('Thanks for your feedback!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit feedback.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="p-6 text-center animate-rise">
        <p className="font-display text-lg font-bold text-white">Thanks for helping us improve CredCloak! 🙏</p>
        {onDismiss && (
          <button type="button" onClick={onDismiss} className="mt-4 text-xs font-semibold text-slate-400 hover:text-white">
            Dismiss
          </button>
        )}
      </Card>
    );
  }

  return (
    <Card className="p-6 animate-rise">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-white">Quick Feedback</h2>
          <p className="mt-1 text-xs text-slate-400">Your loan request went through — tell us how it felt.</p>
        </div>
        {onDismiss && (
          <button type="button" onClick={onDismiss} className="text-slate-500 hover:text-white text-sm">✕</button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            How would you rate this experience?
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`text-2xl transition ${star <= rating ? 'text-amber-400' : 'text-slate-700 hover:text-slate-500'}`}
                aria-label={`Rate ${star} stars`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Would you recommend CredCloak to a friend?
          </label>
          <div className="flex gap-3 text-sm">
            {['Yes', 'Maybe', 'No'].map((option) => (
              <label key={option} className="flex items-center gap-2 text-slate-300">
                <input
                  type="radio"
                  name="wouldRecommend"
                  value={option}
                  checked={wouldRecommend === option}
                  onChange={(e) => setWouldRecommend(e.target.value)}
                  className="accent-indigo-500"
                />
                {option}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="comments" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Anything else? (optional)
          </label>
          <textarea
            id="comments"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-white focus:border-indigo-500 focus:outline-none"
            placeholder="Tell us what worked, what didn't..."
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-500 transition disabled:opacity-40"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
    </Card>
  );
}

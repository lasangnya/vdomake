import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { audioTrackSchema, keyframeSchema } from '@vdomake/validators';
import {
  autoSyncKeyframes,
  getAudioState,
  persistTrack,
  replaceKeyframes,
} from '@/lib/audio/audio-service';
import { publicProcedure } from '../context';

export const audioRouter = {
  /** Loads the audio track + keyframes for a project (null when no upload yet). */
  get: publicProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => getAudioState(input.projectId)),

  /** Saves an audio track (fileUrl + duration + transcript) — used after upload. */
  saveTrack: publicProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        track: audioTrackSchema.omit({ id: true, projectId: true }),
      }),
    )
    .mutation(async ({ input }) => {
      const { track, projectId } = input;
      return persistTrack(projectId, {
        fileUrl: track.fileUrl,
        duration: track.duration,
        transcript: track.transcript,
      });
    }),

  /** Replaces all keyframes for a project. */
  saveKeyframes: publicProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        keyframes: z.array(keyframeSchema.omit({ id: true, projectId: true })).max(50),
      }),
    )
    .mutation(async ({ input }) => {
      await replaceKeyframes(input.projectId, input.keyframes);
      const state = await getAudioState(input.projectId);
      if (state.track === null) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Upload audio before tagging keyframes',
        });
      }
      return state.keyframes;
    }),

  /** Runs pause + content-based auto-sync and persists the resulting keyframes. */
  autoSync: publicProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const suggestions = await autoSyncKeyframes(input.projectId);
      if (suggestions.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Auto-sync needs both a transcript and a storyboard',
        });
      }
      return suggestions;
    }),
};

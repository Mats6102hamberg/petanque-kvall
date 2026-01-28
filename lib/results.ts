import { MatchStatus, ResultStatus, Prisma } from '@prisma/client';
import prisma from './db';

type SubmitResultOutcome = 'pending' | 'locked' | 'disputed';

type ApplyStandingsParams = {
  tx: Prisma.TransactionClient;
  eventId: string;
  teamAPlayers: string[];
  teamBPlayers: string[];
  scoreA: number;
  scoreB: number;
};

export async function submitResult(
  matchId: string,
  userId: string,
  scoreA: number,
  scoreB: number
): Promise<SubmitResultOutcome> {
  if (scoreA < 0 || scoreB < 0) {
    throw new Error('Resultat kan inte vara negativa värden.');
  }

  return prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({
      where: { id: matchId },
      include: {
        teamA: { select: { member1Id: true, member2Id: true } },
        teamB: { select: { member1Id: true, member2Id: true } },
        round: { select: { eventId: true } },
      },
    });

    if (!match) {
      throw new Error(`Match ${matchId} hittades inte.`);
    }

    const teamAPlayers = [match.teamA?.member1Id, match.teamA?.member2Id].filter(
      Boolean
    ) as string[];
    const teamBPlayers = [match.teamB?.member1Id, match.teamB?.member2Id].filter(
      Boolean
    ) as string[];
    const participants = [...new Set([...teamAPlayers, ...teamBPlayers])];

    if (!participants.includes(userId)) {
      throw new Error('Användaren är inte del av denna match.');
    }

    await tx.resultConfirmation.upsert({
      where: { matchId_userId: { matchId, userId } },
      create: {
        matchId,
        userId,
        scoreA,
        scoreB,
        status: ResultStatus.SUBMITTED,
      },
      update: {
        scoreA,
        scoreB,
        status: ResultStatus.SUBMITTED,
      },
    });

    const confirmations = await tx.resultConfirmation.findMany({
      where: {
        matchId,
        userId: { in: participants },
      },
    });

    const allSubmitted =
      confirmations.length === participants.length &&
      participants.every((pid) => confirmations.some((c) => c.userId === pid));

    if (!allSubmitted) {
      return 'pending';
    }

    const [first] = confirmations;
    const aligned = confirmations.every(
      (c) => c.scoreA === first.scoreA && c.scoreB === first.scoreB
    );

    if (!aligned) {
      await tx.resultConfirmation.updateMany({
        where: { matchId },
        data: { status: ResultStatus.DISPUTED },
      });
      return 'disputed';
    }

    const alreadyLocked =
      match.status === MatchStatus.REPORTED_LOCKED ||
      match.status === MatchStatus.FINALIZED;

    if (!alreadyLocked) {
      await tx.match.update({
        where: { id: matchId },
        data: {
          status: MatchStatus.REPORTED_LOCKED,
          scoreA: first.scoreA,
          scoreB: first.scoreB,
        },
      });

      await applyStandingUpdates({
        tx,
        eventId: match.round.eventId,
        teamAPlayers,
        teamBPlayers,
        scoreA: first.scoreA,
        scoreB: first.scoreB,
      });
    }

    await tx.resultConfirmation.updateMany({
      where: { matchId },
      data: { status: ResultStatus.CONFIRMED },
    });

    return 'locked';
  });
}

async function applyStandingUpdates({
  tx,
  eventId,
  teamAPlayers,
  teamBPlayers,
  scoreA,
  scoreB,
}: ApplyStandingsParams) {
  const players = [...new Set([...teamAPlayers, ...teamBPlayers])];

  if (!players.length) {
    return;
  }

  const existing = await tx.standing.findMany({
    where: {
      eventId,
      userId: { in: players },
    },
  });

  const existingMap = new Map(existing.map((row) => [row.userId, row]));
  const missing = players.filter((playerId) => !existingMap.has(playerId));

  if (missing.length) {
    await tx.standing.createMany({
      data: missing.map((userId) => ({ eventId, userId })),
      skipDuplicates: true,
    });
  }

  const standings = await tx.standing.findMany({
    where: {
      eventId,
      userId: { in: players },
    },
  });

  const map = new Map(standings.map((row) => [row.userId, row]));
  const teamASet = new Set(teamAPlayers);
  const teamBSet = new Set(teamBPlayers);
  const isTie = scoreA === scoreB;

  const updates = players.map((playerId) => {
    const row = map.get(playerId);
    if (!row) {
      return null;
    }

    const isTeamA = teamASet.has(playerId);
    const opponentIds = isTeamA ? teamBPlayers : teamAPlayers;
    const opponentsWins = opponentIds.reduce((sum, oppId) => {
      const opponent = map.get(oppId);
      return sum + (opponent?.wins ?? 0);
    }, 0);

    const pointsDelta = isTeamA ? scoreA - scoreB : scoreB - scoreA;
    const winsDelta = isTie ? 0 : isTeamA ? (scoreA > scoreB ? 1 : 0) : scoreB > scoreA ? 1 : 0;
    const sosDelta = opponentsWins;

    return tx.standing.update({
      where: { id: row.id },
      data: {
        wins: row.wins + winsDelta,
        points: row.points + pointsDelta,
        sos: row.sos + sosDelta,
      },
    });
  });

  await Promise.all(updates.filter(Boolean) as Promise<unknown>[]);
}

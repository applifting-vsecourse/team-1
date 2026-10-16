import {
  emptyGenderCounts,
  Gender,
  GenderCounts,
  GENDERS,
} from '@/shared/domain/gender';

export type RoomCapacity = {
  capacity: number;
  gender: Gender;
};

/**
 * Capacity of a term (US-26): women = beds in women's rooms, men = beds in
 * men's rooms. Rooms belong to the event, so every term of it has the same
 * capacity in sprint 1.
 */
export function computeTermCapacity(rooms: RoomCapacity[]): GenderCounts {
  const capacity = emptyGenderCounts();
  for (const room of rooms) capacity[room.gender] += room.capacity;
  return capacity;
}

export function countByGender(items: { gender: Gender }[]): GenderCounts {
  const counts = emptyGenderCounts();
  for (const item of items) counts[item.gender] += 1;
  return counts;
}

/**
 * Free places = capacity − confirmed, per gender. Deliberately not clamped at
 * zero: removing a room may leave a term overbooked, which the organizer must
 * see (docs/PROJEKT.md, section 10).
 */
export function computeFreePlaces(
  capacity: GenderCounts,
  confirmed: GenderCounts,
): GenderCounts {
  const free = emptyGenderCounts();
  for (const gender of GENDERS)
    free[gender] = capacity[gender] - confirmed[gender];
  return free;
}

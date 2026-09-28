export type FlashcardsCard = {
  front: string;
  back: string;
};

export type FlashcardsOptions = {
  className?: string;
  language?: string;
  shuffle?: boolean;
  fallback?: boolean;
};

export type ResolvedFlashcardsOptions = {
  className: string;
  language: string;
  shuffle: boolean;
  fallback: boolean;
};

export type FlashcardsParseSuccess = {
  ok: true;
  cards: FlashcardsCard[];
};

export type FlashcardsParseFailure = {
  ok: false;
  reason: string;
};

export type FlashcardsParseResult =
  | FlashcardsParseSuccess
  | FlashcardsParseFailure;

export type FlashcardsPayload = {
  cards: FlashcardsCard[];
};

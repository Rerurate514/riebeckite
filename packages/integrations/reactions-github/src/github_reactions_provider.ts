import type {
  PageReactions,
  ReactionCount,
  ReactionsProvider,
  ReactionType,
} from "@riebeckite/plugin-reactions";

export type GitHubReactionsOptions = {
  owner: string;
  repo: string;
  token: string;
};

const GITHUB_REACTION_MAP: Record<ReactionType, string> = {
  like: "THUMBS_UP",
  heart: "HEART",
  celebrate: "HOORAY",
  insightful: "EYES",
  curious: "CONFUSED",
};

type SearchDiscussionNode = {
  number: number;
};

type SearchResponse = {
  data?: {
    search?: {
      nodes?: SearchDiscussionNode[];
    };
  };
  errors?: { message: string }[];
};

type DiscussionResponse = {
  data?: {
    repository?: {
      discussion?: {
        reactionGroups: { reaction: string; users: { totalCount: number } }[];
      } | null;
    };
  };
  errors?: { message: string }[];
};

export class GitHubReactionsProvider implements ReactionsProvider {
  readonly capabilities: ReadonlySet<"read" | "write"> = new Set(["read"]);

  constructor(private readonly options: GitHubReactionsOptions) {}

  async getReactions(
    contentId: string,
    _visitorKey?: string,
  ): Promise<PageReactions> {
    const discussionNumber = await this.findDiscussionNumber(contentId);
    if (discussionNumber === null) {
      return {
        contentId,
        counts: Object.keys(GITHUB_REACTION_MAP).map((type) => ({
          type: type as ReactionType,
          count: 0,
          reacted: false,
        })),
      };
    }

    const query = `query($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        discussion(number: $number) {
          reactionGroups {
            reaction
            users { totalCount }
          }
        }
      }
    }`;

    const response = await this.graphql<DiscussionResponse>(query, {
      owner: this.options.owner,
      repo: this.options.repo,
      number: discussionNumber,
    });

    const groups = response.data?.repository?.discussion?.reactionGroups ?? [];
    const counts: ReactionCount[] = Object.entries(GITHUB_REACTION_MAP).map(
      ([type, githubReaction]) => {
        const group = groups.find((g) => g.reaction === githubReaction);
        return {
          type: type as ReactionType,
          count: group?.users.totalCount ?? 0,
          reacted: false,
        };
      },
    );
    return { contentId, counts };
  }

  async addReaction(
    _contentId: string,
    _type: ReactionType,
    _visitorKey: string,
  ): Promise<PageReactions> {
    throw new Error(
      "GitHubReactionsProvider is read-only. Use Giscus client-side widgets to add reactions.",
    );
  }

  async removeReaction(
    _contentId: string,
    _type: ReactionType,
    _visitorKey: string,
  ): Promise<PageReactions> {
    throw new Error(
      "GitHubReactionsProvider is read-only. Use Giscus client-side widgets to remove reactions.",
    );
  }

  private async findDiscussionNumber(
    contentId: string,
  ): Promise<number | null> {
    const searchQuery = `repo:${this.options.owner}/${this.options.repo} type:discussion ${contentId}`;
    const query = `query($searchQuery: String!) {
      search(query: $searchQuery, type: DISCUSSION, first: 5) {
        nodes {
          ... on Discussion { number }
        }
      }
    }`;

    const response = await this.graphql<SearchResponse>(query, {
      searchQuery,
    });
    const nodes = response.data?.search?.nodes ?? [];
    return nodes.length > 0 ? nodes[0].number : null;
  }

  private async graphql<T>(
    query: string,
    variables: Record<string, unknown>,
  ): Promise<T> {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options.token}`,
        "Content-Type": "application/json",
        "User-Agent": "riebeckite-reactions-github",
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(
        `GitHub API HTTP ${response.status}: ${response.statusText}`,
      );
    }

    const json = (await response.json()) as T & {
      errors?: { message: string }[];
    };
    if (json.errors?.length) {
      throw new Error(`GitHub API error: ${json.errors[0].message}`);
    }
    return json;
  }
}

export function githubReactions(
  options: GitHubReactionsOptions,
): GitHubReactionsProvider {
  return new GitHubReactionsProvider(options);
}

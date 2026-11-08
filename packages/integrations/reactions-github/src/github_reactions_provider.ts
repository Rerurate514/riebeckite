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
  mapping?: "pathname" | "url" | "title";
};

const GITHUB_REACTION_MAP: Record<ReactionType, string> = {
  like: "THUMBS_UP",
  heart: "HEART",
  celebrate: "HOORAY",
  insightful: "EYES",
  curious: "THINKING_FACE",
};

type GraphQLDiscussion = {
  id: string;
  reactionGroups: { reaction: string; users: { totalCount: number } }[];
};

type GraphQLResponse = {
  data?: {
    repository?: {
      discussion?: GraphQLDiscussion | null;
    };
  };
  errors?: { message: string }[];
};

export class GitHubReactionsProvider implements ReactionsProvider {
  readonly capabilities: ReadonlySet<"read" | "write"> = new Set(["read"]);

  constructor(private readonly options: GitHubReactionsOptions) {}

  async getReactions(contentId: string): Promise<PageReactions> {
    const discussion = await this.findDiscussion(contentId);
    const counts: ReactionCount[] = Object.entries(GITHUB_REACTION_MAP).map(
      ([type, githubReaction]) => {
        const group = discussion?.reactionGroups.find(
          (g) => g.reaction === githubReaction,
        );
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
  ): Promise<PageReactions> {
    throw new Error(
      "GitHubReactionsProvider is read-only. Use Giscus client-side widgets to add reactions.",
    );
  }

  async removeReaction(
    _contentId: string,
    _type: ReactionType,
  ): Promise<PageReactions> {
    throw new Error(
      "GitHubReactionsProvider is read-only. Use Giscus client-side widgets to remove reactions.",
    );
  }

  private async findDiscussion(
    contentId: string,
  ): Promise<GraphQLDiscussion | null> {
    const query = `query($owner: String!, $repo: String!, $term: String!) {
      repository(owner: $owner, name: $repo) {
        discussion: discussions(first: 1, query: $term) {
          nodes {
            id
            reactionGroups {
              reaction
              users { totalCount }
            }
          }
        }
      }
    }`;

    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options.token}`,
        "Content-Type": "application/json",
        "User-Agent": "riebeckite-reactions-github",
      },
      body: JSON.stringify({
        query,
        variables: {
          owner: this.options.owner,
          repo: this.options.repo,
          term: contentId,
        },
      }),
    });

    const json = (await response.json()) as GraphQLResponse;
    if (json.errors?.length) {
      throw new Error(`GitHub API error: ${json.errors[0].message}`);
    }
    const nodes = (
      json.data?.repository as unknown as {
        discussion?: { nodes?: GraphQLDiscussion[] };
      }
    )?.discussion?.nodes;
    return nodes?.[0] ?? null;
  }
}

export function githubReactions(
  options: GitHubReactionsOptions,
): GitHubReactionsProvider {
  return new GitHubReactionsProvider(options);
}

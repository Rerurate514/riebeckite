import type {
  Comment,
  CommentsPage,
  CommentsProvider,
} from "@riebeckite/plugin-comments";

export type GitHubCommentsOptions = {
  owner: string;
  repo: string;
  token: string;
  categoryId?: string;
  mapping?: "pathname" | "url" | "title";
};

type GraphQLCommentNode = {
  id: string;
  author: { login: string; url: string; avatarUrl: string } | null;
  body: string;
  createdAt: string;
  url: string;
};

type SearchDiscussionNode = {
  number: number;
  title: string;
  url: string;
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
        comments?: { nodes: GraphQLCommentNode[]; totalCount: number };
      } | null;
    };
  };
  errors?: { message: string }[];
};

const MAX_FIRST = 100;

export class GitHubCommentsProvider implements CommentsProvider {
  readonly capabilities: ReadonlySet<"read" | "write"> = new Set(["read"]);

  constructor(private readonly options: GitHubCommentsOptions) {}

  async getComments(contentId: string, limit = 20): Promise<CommentsPage> {
    const first = Math.max(1, Math.min(limit, MAX_FIRST));
    const discussionNumber = await this.findDiscussionNumber(contentId);
    if (discussionNumber === null) {
      return { contentId, comments: [], total: 0 };
    }

    const query = `query($owner: String!, $repo: String!, $number: Int!, $first: Int!) {
      repository(owner: $owner, name: $repo) {
        discussion(number: $number) {
          comments(first: $first) {
            totalCount
            nodes {
              id
              author { login url avatarUrl }
              body
              createdAt
              url
            }
          }
        }
      }
    }`;

    const response = await this.graphql<DiscussionResponse>(query, {
      owner: this.options.owner,
      repo: this.options.repo,
      number: discussionNumber,
      first,
    });

    const discussion = response.data?.repository?.discussion;
    const nodes = discussion?.comments?.nodes ?? [];
    const comments: Comment[] = nodes.map((node) => ({
      id: node.id,
      author: {
        name: node.author?.login ?? "anonymous",
        url: node.author?.url,
        avatarUrl: node.author?.avatarUrl,
      },
      body: node.body,
      createdAt: node.createdAt,
      url: node.url,
    }));

    return {
      contentId,
      comments,
      total: discussion?.comments?.totalCount ?? 0,
    };
  }

  private async findDiscussionNumber(
    contentId: string,
  ): Promise<number | null> {
    const searchQuery = `repo:${this.options.owner}/${this.options.repo} type:discussion ${contentId}`;
    const query = `query($searchQuery: String!) {
      search(query: $searchQuery, type: DISCUSSION, first: 5) {
        nodes {
          ... on Discussion { number title url }
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
        "User-Agent": "riebeckite-comments-github",
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

export function githubComments(
  options: GitHubCommentsOptions,
): GitHubCommentsProvider {
  return new GitHubCommentsProvider(options);
}

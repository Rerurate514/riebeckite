import {
  element as sharedElement,
  getTextContent as sharedGetTextContent,
  hasClass as sharedHasClass,
  text as sharedText,
  visitElements as sharedVisitElements,
} from "@riebeckite/diagram";
import type { ElementNode, HastNode, ParentNode, TextNode } from "./types.js";

export const element = sharedElement as (
  tagName: string,
  properties?: Record<string, unknown>,
  children?: HastNode[],
) => ElementNode;
export const text = sharedText as (value: string) => TextNode;
export const getTextContent = sharedGetTextContent as (
  node: HastNode,
) => string;
export const hasClass = sharedHasClass as (
  node: ElementNode,
  className: string,
) => boolean;
export const visitElements = sharedVisitElements as (
  node: HastNode,
  visitor: (node: ElementNode, parent?: ParentNode, index?: number) => void,
  parent?: ParentNode,
  index?: number,
) => void;

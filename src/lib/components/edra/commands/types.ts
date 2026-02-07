import type { Icon } from '@lucide/svelte';
import type { Editor } from '@tiptap/core';
import type { Node } from '@tiptap/pm/model';
import type { icons } from 'lucide-svelte';

export interface EdraToolBarCommands {
	name: string;
	icon: typeof Icon;
	tooltip?: string;
	shortCut?: string;
	onClick?: (editor: Editor) => void;
	turnInto?: (editor: Editor, node: Node, pos: number) => void;
	isActive?: (editor: Editor) => boolean;
	clickable?: (editor: Editor) => boolean;
}

export interface EdraCommand {
	iconName: keyof typeof icons;
	name: string;
	label: string;
	shortCuts?: string[];
	action: (editor: Editor) => void;
	isActive?: (editor: Editor) => boolean;
}

export interface EdraCommandShortCuts {
	key: string;
}

export interface EdraCommandGroup {
	name: string;
	label: string;
	commands: EdraCommand[];
}

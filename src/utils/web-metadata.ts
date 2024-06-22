/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export let EXTENSION_BASE_URL: string;
export let EXTENSION_VERSION: string;

if (IS_EXTENSION) {
    EXTENSION_BASE_URL = "";
    EXTENSION_VERSION = "";
}

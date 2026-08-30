function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
	const _component_NuxtLink = __nuxt_component_0;
	return _openBlock(), _createElementBlock("div", _hoisted_1, [
		_createCommentVNode(" 顶部全宽常驻吸顶导航栏 (100% 满宽无两侧留白，吸顶固定不动，仅下边缘为水墨雾化模糊) "),
		_createElementVNode("header", _hoisted_2, [
			_createElementVNode("div", _hoisted_3, [
				_createCommentVNode(" 顶部第一行：左侧 Logo + 搜索 + 列切换；右侧 操作按钮组 "),
				_createElementVNode("div", _hoisted_4, [
					_createElementVNode("div", _hoisted_5, [
						_createElementVNode("div", _hoisted_6, [_createVNode($setup["SvgIcon"], {
							name: "bookmark",
							size: "20",
							"extra-class": "bookmark-header-icon"
						})]),
						_createElementVNode("div", _hoisted_7, [
							_createVNode($setup["SvgIcon"], {
								name: "search",
								size: "15",
								"extra-class": "search-icon"
							}),
							_withDirectives(_createElementVNode(
								"input",
								{
									id: "bookmark-search-input",
									name: "searchQuery",
									"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $setup.searchQuery = $event),
									type: "text",
									placeholder: "搜索书签标题、网址或内容..."
								},
								null,
								512
								/* NEED_PATCH */
							), [[_vModelText, $setup.searchQuery]]),
							$setup.searchQuery ? (_openBlock(), _createElementBlock("button", {
								key: 0,
								class: "clear-search-btn",
								title: "清空搜索",
								onClick: _cache[1] || (_cache[1] = ($event) => $setup.searchQuery = "")
							}, [_createVNode($setup["SvgIcon"], {
								name: "close",
								size: "12"
							})])) : _createCommentVNode("v-if", true)
						]),
						_createCommentVNode(" 桌面端列数切换 "),
						_createElementVNode("div", _hoisted_8, [_cache[38] || (_cache[38] = _createElementVNode(
							"span",
							{ class: "switcher-text" },
							"每行排布:",
							-1
							/* CACHED */
						)), _createElementVNode("div", _hoisted_9, [(_openBlock(), _createElementBlock(
							_Fragment,
							null,
							_renderList([
								1,
								2,
								3
							], (col) => {
								return _createElementVNode("button", {
									key: col,
									class: _normalizeClass([
										"col-btn",
										`col-btn-${col}`,
										{ active: $setup.effectiveColumns === col }
									]),
									title: `一行显示 ${col} 个书签`,
									onClick: ($event) => $setup.setColumns(col)
								}, [_createVNode($setup["SvgIcon"], {
									name: `grid-${col}`,
									size: "13"
								}, null, 8, ["name"]), _createElementVNode(
									"span",
									null,
									_toDisplayString(col === 1 ? "1列(详细)" : `${col}列`),
									1
									/* TEXT */
								)], 10, _hoisted_10);
							}),
							64
							/* STABLE_FRAGMENT */
						))])])
					]),
					_createCommentVNode(" 右上角操作区：批量管理 + 导出 + 退出登录 + 主题切换 + 返回首页 "),
					_createElementVNode("div", _hoisted_11, [
						_createElementVNode(
							"button",
							{
								class: _normalizeClass(["nav-action-btn", { active: $setup.isSelectMode }]),
								title: "批量选择与管理书签",
								onClick: $setup.toggleSelectMode
							},
							[_createVNode($setup["SvgIcon"], {
								name: "checkSquare",
								size: "13"
							}), _createElementVNode(
								"span",
								null,
								_toDisplayString($setup.isSelectMode ? "完成选择" : "批量管理"),
								1
								/* TEXT */
							)],
							2
							/* CLASS */
						),
						_createElementVNode("button", {
							class: "nav-action-btn",
							title: "导出为标准 Netscape HTML 或 Markdown 知识库",
							onClick: _cache[2] || (_cache[2] = ($event) => $setup.isExportModalOpen = true)
						}, [_createVNode($setup["SvgIcon"], {
							name: "download",
							size: "13"
						}), _cache[39] || (_cache[39] = _createElementVNode(
							"span",
							null,
							"导出",
							-1
							/* CACHED */
						))]),
						_createElementVNode("button", {
							class: "nav-logout-btn",
							title: "退出登录",
							onClick: $setup.handleLogout
						}, [_createVNode($setup["SvgIcon"], {
							name: "logout",
							size: "14"
						}), _cache[40] || (_cache[40] = _createElementVNode(
							"span",
							null,
							"退出登录",
							-1
							/* CACHED */
						))]),
						_createElementVNode("button", {
							class: "theme-toggle-btn",
							title: `当前主题：${$setup.currentLabel} (点击切换)`,
							onClick: _cache[3] || (_cache[3] = (...args) => $setup.cycleTheme && $setup.cycleTheme(...args))
						}, [_createVNode($setup["SvgIcon"], {
							svg: $setup.currentIconSvg,
							size: "14"
						}, null, 8, ["svg"]), _createElementVNode(
							"span",
							_hoisted_13,
							_toDisplayString($setup.currentLabel),
							1
							/* TEXT */
						)], 8, _hoisted_12),
						_createVNode(_component_NuxtLink, {
							to: "/",
							class: "nav-switch-btn",
							title: "进入首页"
						}, {
							default: _withCtx(() => [_createVNode($setup["SvgIcon"], {
								name: "home",
								size: "14"
							}), _cache[41] || (_cache[41] = _createElementVNode(
								"span",
								null,
								"首页",
								-1
								/* CACHED */
							))]),
							_: 1
						})
					])
				]),
				_createCommentVNode(" 顶部第二行：分类文件夹导航栏 "),
				_createElementVNode("div", _hoisted_14, [
					_createCommentVNode(" 全部书签 Tab (支持作为移出到根目录的 Drop Target) "),
					_createElementVNode(
						"button",
						{
							class: _normalizeClass(["folder-tab-btn root-all-tab", {
								active: $setup.activeFolder === "all",
								"is-drag-over-root": $setup.dragOverTarget === "all" && $setup.draggedFolderName,
								"is-drag-target": $setup.dragOverTarget === "all" && $setup.draggedBookmarkId
							}]),
							title: "点击查看所有书签。拖拽子文件夹至此可移出至根目录，也可将卡片拖入此移出所有分类",
							onClick: _cache[4] || (_cache[4] = ($event) => $setup.activeFolder = "all"),
							onDragover: _cache[5] || (_cache[5] = _withModifiers(($event) => $setup.handleFolderDragOver($event, "all"), ["prevent"])),
							onDragleave: _cache[6] || (_cache[6] = ($event) => $setup.handleFolderDragLeave($event, "all")),
							onDrop: _cache[7] || (_cache[7] = ($event) => $setup.handleFolderDrop($event, "all"))
						},
						[
							_createVNode($setup["SvgIcon"], {
								name: "folder",
								size: "13"
							}),
							_cache[42] || (_cache[42] = _createElementVNode(
								"span",
								{ class: "folder-name" },
								"全部",
								-1
								/* CACHED */
							)),
							_createElementVNode(
								"span",
								_hoisted_15,
								"(" + _toDisplayString($setup.bookmarks.length) + ")",
								1
								/* TEXT */
							),
							$setup.dragOverTarget === "all" && $setup.draggedFolderName ? (_openBlock(), _createElementBlock("span", _hoisted_16, "移出到根目录")) : _createCommentVNode("v-if", true)
						],
						34
						/* CLASS, NEED_HYDRATION */
					),
					_createCommentVNode(" 未分类书签 Tab "),
					_createElementVNode(
						"button",
						{
							class: _normalizeClass(["folder-tab-btn root-uncategorized-tab", {
								active: $setup.activeFolder === "uncategorized",
								"is-drag-target": $setup.dragOverTarget === "uncategorized" && $setup.draggedBookmarkId
							}]),
							title: "点击查看未分类书签。可将卡片拖入此移出所有分类",
							onClick: _cache[8] || (_cache[8] = ($event) => $setup.activeFolder = "uncategorized"),
							onDragover: _cache[9] || (_cache[9] = _withModifiers(($event) => $setup.handleFolderDragOver($event, "uncategorized"), ["prevent"])),
							onDragleave: _cache[10] || (_cache[10] = ($event) => $setup.handleFolderDragLeave($event, "uncategorized")),
							onDrop: _cache[11] || (_cache[11] = ($event) => $setup.handleFolderDrop($event, "uncategorized"))
						},
						[
							_createVNode($setup["SvgIcon"], {
								name: "folder",
								size: "13"
							}),
							_cache[43] || (_cache[43] = _createElementVNode(
								"span",
								{ class: "folder-name" },
								"未分类",
								-1
								/* CACHED */
							)),
							_createElementVNode(
								"span",
								_hoisted_17,
								"(" + _toDisplayString($setup.uncategorizedBookmarks.length) + ")",
								1
								/* TEXT */
							),
							$setup.dragOverTarget === "uncategorized" && $setup.draggedBookmarkId ? (_openBlock(), _createElementBlock("span", _hoisted_18, "移至未分类")) : _createCommentVNode("v-if", true)
						],
						34
						/* CLASS, NEED_HYDRATION */
					),
					_createCommentVNode(" 一级分类文件夹 Tabs 列表容器 (使用独立组件隔离各自的 Virtual DOM Block) "),
					_createElementVNode("div", _hoisted_19, [(_openBlock(true), _createElementBlock(
						_Fragment,
						null,
						_renderList($setup.topLevelFolders, (folder) => {
							return _openBlock(), _createBlock($setup["FolderTabItem"], {
								key: folder.name,
								folder,
								"is-active": $setup.isFolderOrDescendantActive(folder.name),
								"is-select-mode": $setup.isSelectMode,
								"drag-over-target": $setup.dragOverTarget,
								"drag-over-position": $setup.dragOverPosition,
								"dragged-folder-name": $setup.draggedFolderName,
								"dragged-bookmark-id": $setup.draggedBookmarkId,
								"cascade-path": $setup.cascadePath,
								onSelectFolder: _cache[12] || (_cache[12] = ($event) => {
									$setup.activeFolder = $event;
									$setup.cascadePath = [];
								}),
								onOpenCascade: _cache[13] || (_cache[13] = (d, f) => $setup.openCascadeLevel(d, f)),
								onCancelClose: $setup.cancelCloseCascade,
								onScheduleClose: $setup.scheduleCloseCascade,
								onMoveOut: $setup.handleMoveOutToRoot,
								onRemoveBm: $setup.handleRemoveBmFromFolder,
								onDragStartBm: $setup.handleBmDragStart,
								onDragEndBm: $setup.handleBmDragEnd,
								onDragStart: $setup.handleFolderDragStart,
								onDragEnd: $setup.handleFolderDragEnd,
								onDragOver: $setup.handleFolderDragOver,
								onDragLeave: $setup.handleFolderDragLeave,
								onDrop: $setup.handleFolderDrop
							}, null, 8, [
								"folder",
								"is-active",
								"is-select-mode",
								"drag-over-target",
								"drag-over-position",
								"dragged-folder-name",
								"dragged-bookmark-id",
								"cascade-path"
							]);
						}),
						128
						/* KEYED_FRAGMENT */
					))]),
					_createCommentVNode(" 新建文件夹按钮与输入表单 "),
					_createElementVNode("div", _hoisted_20, [!$setup.isCreatingFolder ? (_openBlock(), _createElementBlock("button", {
						key: 0,
						class: "btn-add-folder",
						title: "新建分类文件夹",
						onClick: _cache[14] || (_cache[14] = ($event) => $setup.isCreatingFolder = true)
					}, [_createVNode($setup["SvgIcon"], {
						name: "plus",
						size: "13"
					}), _cache[44] || (_cache[44] = _createElementVNode(
						"span",
						null,
						"新建文件夹",
						-1
						/* CACHED */
					))])) : (_openBlock(), _createElementBlock("div", _hoisted_21, [
						_withDirectives(_createElementVNode(
							"input",
							{
								"onUpdate:modelValue": _cache[15] || (_cache[15] = ($event) => $setup.newFolderName = $event),
								type: "text",
								placeholder: "分类名称(支持 父/子)...",
								class: "new-folder-input",
								autoFocus: "",
								onKeydown: [_withKeys($setup.submitNewFolder, ["enter"]), _cache[16] || (_cache[16] = _withKeys(($event) => $setup.isCreatingFolder = false, ["esc"]))]
							},
							null,
							544
							/* NEED_HYDRATION, NEED_PATCH */
						), [[_vModelText, $setup.newFolderName]]),
						_createElementVNode("button", {
							class: "btn-confirm-add",
							title: "确认添加",
							onClick: $setup.submitNewFolder
						}, [_createVNode($setup["SvgIcon"], {
							name: "check",
							size: "13"
						})]),
						_createElementVNode("button", {
							class: "btn-cancel-add",
							title: "取消",
							onClick: _cache[17] || (_cache[17] = ($event) => $setup.isCreatingFolder = false)
						}, [_createVNode($setup["SvgIcon"], {
							name: "close",
							size: "13"
						})])
					]))])
				])
			]),
			_createCommentVNode(" 仅边缘是雾化效果的水墨过渡层 (固定在吸顶导航底部) "),
			_cache[45] || (_cache[45] = _createElementVNode(
				"div",
				{ class: "header-mist-edge" },
				null,
				-1
				/* CACHED */
			))
		]),
		_createCommentVNode(" 下方主体滚动内容区 (居中最大宽度 1200px) "),
		_createElementVNode("main", _hoisted_22, [_createElementVNode("div", _hoisted_23, [
			_createCommentVNode(" 多级面包屑与当前文件夹操作条 (当激活文件夹非 'all' 时展示) "),
			$setup.activeFolder !== "all" ? (_openBlock(), _createElementBlock("div", _hoisted_24, [_createElementVNode("div", _hoisted_25, [
				_createCommentVNode(" 面包屑导航 (支持点击跳转与拖拽放入/移出) "),
				_createElementVNode("nav", _hoisted_26, [_createElementVNode(
					"span",
					{
						class: _normalizeClass(["breadcrumb-node breadcrumb-root", { "is-drop-target": $setup.dragOverTarget === "all" }]),
						title: "全部书签根目录 (拖拽至此移出至根目录)",
						onClick: _cache[18] || (_cache[18] = ($event) => $setup.activeFolder = "all"),
						onDragover: _cache[19] || (_cache[19] = _withModifiers(($event) => $setup.handleFolderDragOver($event, "all"), ["prevent"])),
						onDragleave: _cache[20] || (_cache[20] = ($event) => $setup.handleFolderDragLeave($event, "all")),
						onDrop: _cache[21] || (_cache[21] = ($event) => $setup.handleFolderDrop($event, "all"))
					},
					" 全部 ",
					34
					/* CLASS, NEED_HYDRATION */
				), _createElementVNode("div", _hoisted_27, [(_openBlock(true), _createElementBlock(
					_Fragment,
					null,
					_renderList($setup.activeFolderBreadcrumbs, (crumb, idx) => {
						return _openBlock(), _createElementBlock("span", {
							key: crumb.path,
							class: "breadcrumb-item-wrapper"
						}, [_cache[46] || (_cache[46] = _createElementVNode(
							"span",
							{ class: "breadcrumb-separator" },
							"/",
							-1
							/* CACHED */
						)), _createElementVNode("span", {
							class: _normalizeClass(["breadcrumb-node", {
								"breadcrumb-current": idx === $setup.activeFolderBreadcrumbs.length - 1,
								"is-drop-target": $setup.dragOverTarget === crumb.path
							}]),
							title: idx === $setup.activeFolderBreadcrumbs.length - 1 ? `当前所在文件夹：${crumb.name}` : `跳转至：${crumb.name} (可拖拽放入此层级)`,
							onClick: ($event) => $setup.activeFolder = crumb.path,
							onDragover: _withModifiers(($event) => $setup.handleFolderDragOver($event, crumb.path), ["prevent"]),
							onDragleave: ($event) => $setup.handleFolderDragLeave($event, crumb.path),
							onDrop: ($event) => $setup.handleFolderDrop($event, crumb.path)
						}, _toDisplayString(crumb.name), 43, _hoisted_28)]);
					}),
					128
					/* KEYED_FRAGMENT */
				))])]),
				_createElementVNode(
					"span",
					_hoisted_29,
					"共 " + _toDisplayString($setup.filteredAndSortedBookmarks.length) + " 条书签",
					1
					/* TEXT */
				)
			]), $setup.activeFolder !== "uncategorized" ? (_openBlock(), _createElementBlock("div", _hoisted_30, [
				_createCommentVNode(" 移动文件夹/加入另一文件夹分类 按钮 (将当前文件夹加入到另一个文件夹或移至根目录) "),
				_createElementVNode("button", {
					class: "folder-action-pill",
					title: "将当前文件夹加入到另一个文件夹或移至根目录",
					onClick: _cache[22] || (_cache[22] = ($event) => $setup.openMoveFolderModal($setup.activeFolder))
				}, [_createVNode($setup["SvgIcon"], {
					name: "folder",
					size: "12"
				}), _cache[47] || (_cache[47] = _createElementVNode(
					"span",
					null,
					"分类",
					-1
					/* CACHED */
				))]),
				_createCommentVNode(" 如果是子文件夹，提供一键移出到根目录 "),
				$setup.activeFolder.includes("/") ? (_openBlock(), _createElementBlock("button", {
					key: 0,
					class: "folder-action-pill btn-move-out",
					title: "将此文件夹移出到顶级根目录",
					onClick: _cache[23] || (_cache[23] = ($event) => $setup.handleMoveOutToRoot($setup.activeFolder))
				}, [_createVNode($setup["SvgIcon"], {
					name: "cornerUpLeft",
					size: "12"
				}), _cache[48] || (_cache[48] = _createElementVNode(
					"span",
					null,
					"移出到根目录",
					-1
					/* CACHED */
				))])) : _createCommentVNode("v-if", true),
				_createElementVNode("button", {
					class: "folder-action-pill",
					title: "重命名当前文件夹",
					onClick: _cache[24] || (_cache[24] = ($event) => $setup.startRenameFolder($setup.activeFolder))
				}, [_createVNode($setup["SvgIcon"], {
					name: "edit",
					size: "12"
				}), _cache[49] || (_cache[49] = _createElementVNode(
					"span",
					null,
					"重命名",
					-1
					/* CACHED */
				))]),
				_createElementVNode("button", {
					class: "folder-action-pill btn-danger-pill",
					title: "删除此文件夹",
					onClick: _cache[25] || (_cache[25] = ($event) => $setup.handleDeleteFolder($setup.activeFolder))
				}, [_createVNode($setup["SvgIcon"], {
					name: "trash",
					size: "12"
				}), _cache[50] || (_cache[50] = _createElementVNode(
					"span",
					null,
					"删除文件夹",
					-1
					/* CACHED */
				))]),
				_createElementVNode("button", {
					class: "folder-action-pill btn-view-all",
					title: "查看所有书签",
					onClick: _cache[26] || (_cache[26] = ($event) => $setup.activeFolder = "all")
				}, [..._cache[51] || (_cache[51] = [_createElementVNode(
					"span",
					null,
					"查看全部",
					-1
					/* CACHED */
				)])])
			])) : (_openBlock(), _createElementBlock("div", _hoisted_31, [_createElementVNode("button", {
				class: "folder-action-pill btn-view-all",
				title: "查看所有书签",
				onClick: _cache[27] || (_cache[27] = ($event) => $setup.activeFolder = "all")
			}, [..._cache[52] || (_cache[52] = [_createElementVNode(
				"span",
				null,
				"查看全部",
				-1
				/* CACHED */
			)])])]))])) : _createCommentVNode("v-if", true),
			_createCommentVNode(" 当前文件夹直属子分类快速导航栏 (如果当前激活文件夹有子文件夹) "),
			$setup.activeFolder !== "all" && $setup.activeFolder !== "uncategorized" && $setup.activeDirectSubfolders.length > 0 ? (_openBlock(), _createElementBlock("div", _hoisted_32, [_createElementVNode("div", _hoisted_33, [_createVNode($setup["SvgIcon"], {
				name: "folder",
				size: "12"
			}), _cache[53] || (_cache[53] = _createElementVNode(
				"span",
				{ class: "quick-nav-label" },
				"下级子文件夹:",
				-1
				/* CACHED */
			))]), _createElementVNode("div", _hoisted_34, [(_openBlock(true), _createElementBlock(
				_Fragment,
				null,
				_renderList($setup.activeDirectSubfolders, (subf) => {
					return _openBlock(), _createElementBlock("button", {
						key: subf.name,
						class: "quick-subfolder-chip",
						draggable: !$setup.isSelectMode,
						title: `点击进入 [${$setup.getFolderBaseName(subf.name)}]，可拖拽排序或移出`,
						onClick: ($event) => $setup.activeFolder = subf.name,
						onDragstart: ($event) => $setup.handleFolderDragStart($event, subf.name),
						onDragend: $setup.handleFolderDragEnd,
						onDragover: _withModifiers(($event) => $setup.handleFolderDragOver($event, subf.name), ["prevent"]),
						onDragleave: ($event) => $setup.handleFolderDragLeave($event, subf.name),
						onDrop: ($event) => $setup.handleFolderDrop($event, subf.name)
					}, [
						_createVNode($setup["SvgIcon"], {
							name: "folder",
							size: "12"
						}),
						_createElementVNode(
							"span",
							null,
							_toDisplayString($setup.getFolderBaseName(subf.name)),
							1
							/* TEXT */
						),
						_createElementVNode(
							"span",
							_hoisted_36,
							"(" + _toDisplayString($setup.getFolderBookmarks(subf.name, true).length) + ")",
							1
							/* TEXT */
						)
					], 40, _hoisted_35);
				}),
				128
				/* KEYED_FRAGMENT */
			))])])) : _createCommentVNode("v-if", true),
			_createCommentVNode(" 重命名文件夹弹窗 (已抽离独立无障碍组件) "),
			_createVNode($setup["RenameFolderModal"], {
				"is-open": $setup.isRenamingFolder,
				"folder-name": $setup.folderBeingRenamed,
				folders: $setup.folders,
				onClose: _cache[28] || (_cache[28] = ($event) => $setup.isRenamingFolder = false),
				onSubmit: $setup.submitRenameFolderModal
			}, null, 8, [
				"is-open",
				"folder-name",
				"folders"
			]),
			_createCommentVNode(" 移动文件夹/归入其他文件夹弹窗 "),
			_createVNode($setup["MoveFolderModal"], {
				"is-open": $setup.isMoveFolderModalOpen,
				"folder-name": $setup.folderBeingMoved,
				folders: $setup.folders,
				onClose: _cache[29] || (_cache[29] = ($event) => $setup.isMoveFolderModalOpen = false),
				onMoveFolder: $setup.handleMoveFolderModalSubmit
			}, null, 8, [
				"is-open",
				"folder-name",
				"folders"
			]),
			_createCommentVNode(" 移动端长按分类浮层 (已抽离独立组件) "),
			_createVNode($setup["MobileFolderSelectModal"], {
				"is-open": $setup.isMobileFolderModalOpen,
				"bookmark-id": $setup.selectedMobileBookmark?.id || "",
				"bookmark-title": $setup.selectedMobileBookmark?.title || "",
				"current-folder": $setup.selectedMobileBookmark?.folder,
				folders: $setup.folders,
				onClose: _cache[30] || (_cache[30] = ($event) => $setup.isMobileFolderModalOpen = false),
				onAssign: $setup.handleAssignFolder,
				onCreateAndAssign: $setup.handleCreateAndAssignFolder
			}, null, 8, [
				"is-open",
				"bookmark-id",
				"bookmark-title",
				"current-folder",
				"folders"
			]),
			_createCommentVNode(" 导出书签弹窗 (全量 / 分类 / 勾选导出) "),
			_createVNode($setup["ExportBookmarkModal"], {
				modelValue: $setup.isExportModalOpen,
				"onUpdate:modelValue": _cache[31] || (_cache[31] = ($event) => $setup.isExportModalOpen = $event),
				"all-bookmarks": $setup.bookmarks,
				"active-folder": $setup.activeFolder,
				"selected-bookmark-ids": $setup.selectedBookmarkIds,
				onExported: $setup.handleExported
			}, null, 8, [
				"modelValue",
				"all-bookmarks",
				"active-folder",
				"selected-bookmark-ids"
			]),
			_createCommentVNode(" 导入书签弹窗 (直接从书签页一键导入与建分类) "),
			_createVNode($setup["ExtensionInstallModal"], {
				modelValue: $setup.isImportModalOpen,
				"onUpdate:modelValue": _cache[32] || (_cache[32] = ($event) => $setup.isImportModalOpen = $event),
				onImportBookmarks: $setup.handleImportFromModal
			}, null, 8, ["modelValue"]),
			_createCommentVNode(" 核心内容展示区 (空状态 / 书签卡片网格) "),
			_createElementVNode("div", _hoisted_37, [_createCommentVNode(" 空状态 "), $setup.filteredAndSortedBookmarks.length === 0 ? (_openBlock(), _createElementBlock("div", _hoisted_38, [
				_createVNode($setup["SvgIcon"], {
					name: "bookmark",
					size: "38",
					"extra-class": "empty-icon"
				}),
				_cache[54] || (_cache[54] = _createElementVNode(
					"h3",
					{ class: "empty-title" },
					"暂无相关书签",
					-1
					/* CACHED */
				)),
				_createElementVNode(
					"p",
					_hoisted_39,
					_toDisplayString($setup.activeFolder !== "all" ? `分类 [${$setup.activeFolder}] 下暂无书签，可从下方长按拖拽卡片至此文件夹归类。` : "在首页输入任意网页链接生成总结后，点击“保存到书签”即可自动沉淀到这里。"),
					1
					/* TEXT */
				),
				$setup.activeFolder !== "all" ? (_openBlock(), _createElementBlock("button", {
					key: 0,
					class: "btn-secondary btn-sm",
					style: { "margin-top": "0.75rem" },
					onClick: _cache[33] || (_cache[33] = ($event) => $setup.activeFolder = "all")
				}, " 返回查看全部书签 ")) : _createCommentVNode("v-if", true)
			])) : (_openBlock(), _createElementBlock(
				_Fragment,
				{ key: 1 },
				[_createCommentVNode(" 书签网格列表 (组件化 + 分批极速渲染 + 支持桌面拖拽与移动端长按归类) "), _createElementVNode("div", _hoisted_40, [
					_createElementVNode(
						"div",
						{ class: _normalizeClass(["cards-grid", [`grid-cols-${$setup.effectiveColumns}`]]) },
						[(_openBlock(true), _createElementBlock(
							_Fragment,
							null,
							_renderList($setup.displayedBookmarks, (bm) => {
								return _openBlock(), _createBlock($setup["BookmarkCard"], {
									key: bm.id,
									bookmark: bm,
									"is-editing": $setup.editingBookmarkId === bm.id,
									"edit-text": $setup.inlineEditText,
									"is-dragging": $setup.draggedBookmarkId === bm.id,
									"is-select-mode": $setup.isSelectMode,
									"is-selected": $setup.selectedBookmarkIds.has(bm.id),
									onDragstart: $setup.handleDragStart,
									onDragend: $setup.handleDragEnd,
									onLongPress: $setup.handleMobileLongPress,
									onOpenMobileFolderSelect: $setup.handleMobileLongPress,
									onFilterFolder: _cache[34] || (_cache[34] = ($event) => $setup.activeFolder = $event),
									onRemoveFromFolder: $setup.handleRemoveBmFromFolder,
									onTogglePin: $setup.togglePin,
									onToggleSelect: $setup.toggleSelectBookmark,
									onStartInlineEdit: $setup.startInlineEdit,
									onCancelInlineEdit: $setup.cancelInlineEdit,
									onSaveInlineEdit: $setup.saveInlineEdit,
									onUpdateEditText: _cache[35] || (_cache[35] = ($event) => $setup.inlineEditText = $event),
									onDelete: $setup.handleDelete
								}, null, 8, [
									"bookmark",
									"is-editing",
									"edit-text",
									"is-dragging",
									"is-select-mode",
									"is-selected",
									"onTogglePin"
								]);
							}),
							128
							/* KEYED_FRAGMENT */
						))],
						2
						/* CLASS */
					),
					_createCommentVNode(" 海量数据平滑分批展示 (防卡顿) "),
					$setup.filteredAndSortedBookmarks.length > $setup.displayLimit ? (_openBlock(), _createElementBlock("div", _hoisted_41, [_createElementVNode("button", {
						type: "button",
						class: "btn-secondary btn-sm btn-load-more",
						onClick: _cache[36] || (_cache[36] = ($event) => $setup.displayLimit += 40)
					}, [_createElementVNode(
						"span",
						null,
						"加载更多书签 (已显示 " + _toDisplayString($setup.displayedBookmarks.length) + " / 共 " + _toDisplayString($setup.filteredAndSortedBookmarks.length) + " 条)",
						1
						/* TEXT */
					)])])) : _createCommentVNode("v-if", true)
				])],
				2112
				/* STABLE_FRAGMENT, DEV_ROOT_FRAGMENT */
			))])
		])]),
		_createCommentVNode(" 批量管理底部悬浮操作栏 "),
		$setup.isSelectMode ? (_openBlock(), _createElementBlock("div", _hoisted_42, [_createElementVNode("div", _hoisted_43, [_createElementVNode("span", _hoisted_44, [
			_cache[55] || (_cache[55] = _createTextVNode(
				"已选 ",
				-1
				/* CACHED */
			)),
			_createElementVNode(
				"strong",
				null,
				_toDisplayString($setup.selectedBookmarkIds.size),
				1
				/* TEXT */
			),
			_cache[56] || (_cache[56] = _createTextVNode(
				" 项",
				-1
				/* CACHED */
			))
		]), _createElementVNode(
			"button",
			{
				class: "btn-bulk-act",
				onClick: $setup.selectAllInCurrentView
			},
			_toDisplayString($setup.selectedBookmarkIds.size >= $setup.displayedBookmarks.length && $setup.displayedBookmarks.length > 0 ? "取消全选" : "全选当前"),
			1
			/* TEXT */
		)]), _createElementVNode("div", _hoisted_45, [
			_createElementVNode("button", {
				class: "btn-bulk-act btn-primary-bulk",
				disabled: $setup.selectedBookmarkIds.size === 0,
				onClick: _cache[37] || (_cache[37] = ($event) => $setup.isExportModalOpen = true)
			}, [_createVNode($setup["SvgIcon"], {
				name: "download",
				size: "13"
			}), _createElementVNode(
				"span",
				null,
				"导出所选 (" + _toDisplayString($setup.selectedBookmarkIds.size) + ")",
				1
				/* TEXT */
			)], 8, _hoisted_46),
			_createElementVNode("button", {
				class: "btn-bulk-act btn-danger-bulk",
				disabled: $setup.selectedBookmarkIds.size === 0,
				onClick: $setup.batchDeleteSelected
			}, [_createVNode($setup["SvgIcon"], {
				name: "trash",
				size: "13"
			}), _cache[57] || (_cache[57] = _createElementVNode(
				"span",
				null,
				"批量删除",
				-1
				/* CACHED */
			))], 8, _hoisted_47),
			_createElementVNode("button", {
				class: "btn-bulk-act",
				onClick: $setup.toggleSelectMode
			}, "退出管理")
		])])) : _createCommentVNode("v-if", true),
		_createCommentVNode(" 全局轻量 Toast 提示 "),
		$setup.toastMessage ? (_openBlock(), _createElementBlock("div", _hoisted_48, [_createElementVNode(
			"span",
			null,
			_toDisplayString($setup.toastMessage),
			1
			/* TEXT */
		)])) : _createCommentVNode("v-if", true)
	]);
}
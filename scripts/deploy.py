"""
本同步脚本文件采用GPLv3授权
@"license": <https://www.gnu.org/licenses/gpl-3.0.zh-cn.html>
@author: <github@Blossomstripe>
@source: <https://github.com/TopRealm/InterfaceCodes/blob/master/scripts/sync_mediawiki.py>
"""
import os
import subprocess as sp

import mwclient

# 常量部分
# 定义部署源文件、目标文件和授权协议
DEPLOY_TARGETS = [
	# twinkle
	{
		"file": 'dist/twinkle/twinkle.js',
		"target": 'MediaWiki:Gadget-Twinkle.js',
		"license": 'src/licenseHeader'
	},
	{
		"file": 'src/twinkle/twinkle.css',
		"target": 'MediaWiki:Gadget-Twinkle.css',
		"license": 'src/licenseHeader'
	},
	{
		"file": 'src/twinkle/twinkle-pagestyles.css',
		"target": 'MediaWiki:Gadget-Twinkle-pagestyles.css',
		"license": 'src/licenseHeader'
	},
	# modules
	{
		"file": 'dist/modules/friendlytag.js',
		"target": 'MediaWiki:Gadget-friendlytag.js',
		"license": 'src/licenseHeader'
	},
	{
		"file": 'dist/modules/friendlytalkback.js',
		"target": 'MediaWiki:Gadget-friendlytalkback.js',
		"license": 'src/licenseHeader'
	},
	{
		"file": 'dist/modules/twinklearv.js',
		"target": 'MediaWiki:Gadget-twinklearv.js',
		"license": 'src/licenseHeader'
	},
	{
		"file": 'dist/modules/twinklebatchprotect.js',
		"target": 'MediaWiki:Gadget-twinklebatchprotect.js',
		"license": 'src/licenseHeader'
	},
	{
		"file": 'dist/modules/twinklebatchdelete.js',
		"target": 'MediaWiki:Gadget-twinklebatchdelete.js',
		"license": 'src/licenseHeader'
	},
	{
		"file": 'dist/modules/twinklebatchundelete.js',
		"target": 'MediaWiki:Gadget-twinklebatchundelete.js',
		"license": 'src/licenseHeader'
	},
	{
		"file": 'dist/modules/twinkleblock.js',
		"target": 'MediaWiki:Gadget-twinkleblock.js',
		"license": 'src/licenseHeader'
	},
	{
		"file": 'dist/modules/twinkleclose.js',
		"target": 'MediaWiki:Gadget-twinkleclose.js',
		"license": 'src/licenseHeader'
	},
	{
		"file": 'dist/modules/twinkleconfig.js',
		"target": 'MediaWiki:Gadget-twinkleconfig.js',
		"license": 'src/licenseHeader'
	},
	{
		"file": 'dist/modules/twinklecopyvio.js',
		"target": 'MediaWiki:Gadget-twinklecopyvio.js',
		"license": 'src/licenseHeader'
	},
	{
		"file": 'dist/modules/twinklediff.js',
		"target": 'MediaWiki:Gadget-twinklediff.js',
		"license": 'src/licenseHeader'
	},
	{
		"file": 'dist/modules/twinklefluff.js',
		"target": 'MediaWiki:Gadget-twinklefluff.js',
		"license": 'src/licenseHeader'
	},
	{
		"file": 'dist/modules/twinkleimage.js',
		"target": 'MediaWiki:Gadget-twinkleimage.js',
		"license": 'src/licenseHeader'
	},
	{
		"file": 'dist/modules/twinkleprotect.js',
		"target": 'MediaWiki:Gadget-twinkleprotect.js',
		"license": 'src/licenseHeader'
	},
	{
		"file": 'dist/modules/twinklespeedy.js',
		"target": 'MediaWiki:Gadget-twinklespeedy.js',
		"license": 'src/licenseHeader'
	},
	{
		"file": 'dist/modules/twinklestub.js',
		"target": 'MediaWiki:Gadget-twinklestub.js',
		"license": 'src/licenseHeader'
	},
	{
		"file": 'dist/modules/twinkleunlink.js',
		"target": 'MediaWiki:Gadget-twinkleunlink.js',
		"license": 'src/licenseHeader'
	},
	{
		"file": 'dist/modules/twinklewarn.js',
		"target": 'MediaWiki:Gadget-twinklewarn.js',
		"license": 'src/licenseHeader'
	},
	{
		"file": 'dist/modules/twinklexfd.js',
		"target": 'MediaWiki:Gadget-twinklexfd.js',
		"license": 'src/licenseHeader'
	},
	# Morebits
	{
		"file": 'dist/morebits/morebits.js',
		"target": 'MediaWiki:Gadget-morebits.js',
		"license": 'src/licenseHeader'
	},
	{
		"file": 'src/morebits/morebits.css',
		"target": 'MediaWiki:Gadget-morebits.css',
		"license": 'src/licenseHeader'
	},
	# Select2
	{
		"file": 'src/select2/select2.min.css',
		"target": 'MediaWiki:Gadget-select2.min.css',
		"license": 'src/select2/select2-licenseHeader'
	},
	{
		"file": 'src/select2/select2.min.js',
		"target": 'MediaWiki:Gadget-select2.min.js',
		"license": 'src/select2/select2-licenseHeader'
	}
]


def last_commit_info(file_name: str) -> tuple:
    """调用bash的git命令，获取给定文件的最后一次commit哈希值及留言。

    Args:
        file_name (str): 文件路径

    Raises:
        Exception: 若git返回的哈希值未通过格式检查，则抛出异常

    Returns:
        tuple: (获取的完整SHA-1哈希值, 留言)
    """    
    cmd = f"git log --pretty=format:\"%H %s\" -1 -- {file_name}"
    ans = sp.run(cmd, stdout=sp.PIPE, shell=True).stdout.decode("utf-8").strip()
    commit_hash = ans.split(" ", 1)[0]
    commit_msg = ans.split(" ", 1)[1]
    # 格式检查
    if commit_hash.isalnum() and len(commit_hash) == 40:
        return (commit_hash, commit_msg)
    else:
        raise Exception("获取Commit Hash失败：格式检查未通过")


def sync_file(site: mwclient.Site, page_name: str, text_new: str, file_name=None) -> None:
    """将传入的新内容与MediaWiki对应页面内容进行比对，若不一致则对页面进行更新。

    Args:
        site (mwclient.Site): 已登录的mwclient.Site对象
        page_name (str): 目标MediaWiki页面名称
        text_new (str): 用于比对的新内容
        file_name (str, optional): 文件名，用于调用last_commit_hash函数获取commit记录。默认值为None，即不在编辑摘要中记录commit哈希
    """    
    page = site.pages[page_name]
    text_old = page.text()
    # MediaWiki会自动删除上传文本末尾的空白字符
    if text_old != text_new.rstrip():
        summary = "Git更新："
        if file_name is not None:
            commit_hash, commit_msg = last_commit_info(file_name)
            summary += f"([https://github.com/TopRealm/InterfaceCodes/commit/{commit_hash} {commit_hash[:7]}]) {commit_msg}"
        page.edit(text_new, summary)
        print(page_name, "\t", "changed")
    else:
        print(page_name, "\t", "not_changed")


# 登录MediaWiki
site = mwclient.Site("wiki.zorua.top", path="/")
site.login("Github-bot", os.environ["MW_BOT_PASSWORD"])


# 同步仓库中的代码文件
for deploy_item in DEPLOY_TARGETS:
    with open(deploy_item["license"], "r", encoding="utf-8") as pfile:
        page_text = pfile.read()

    with open(deploy_item["file"], "r", encoding="utf-8") as pfile:
        page_text += pfile.read().rstrip()
    
    sync_file(site, deploy_item["target"], page_text, deploy_item["file"])

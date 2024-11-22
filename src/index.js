const fs = require("fs")
const { parse } = require("node-html-parser")
const { glob } = require("glob")
const urlRegex = require("url-regex")

const urlPattern = /(https?:\/\/[^/]*)/i

function dnsPrefetchPlugin() {
  return {
    name: "vite-plugin-dns-prefetch",
    apply: "build", // 仅在构建阶段应用
    enforce: "post", // 在其他插件之后运行
    closeBundle: async () => {
      const urls = new Set()

      // 遍历打包输出目录中的所有 HTML、CSS、JS 文件
      const searchDomain = async () => {
        const files = await glob("dist/**/*.{html,css,js}")
        for (const file of files) {
          const source = fs.readFileSync(file, "utf-8")
          const matches = source.match(urlRegex({ strict: true }))
          if (matches) {
            matches.forEach((url) => {
              const match = url.match(urlPattern)
              if (match && match[1]) {
                urls.add(match[1])
              }
            })
          }
        }
      }

      // 将所有外部域名生成 link 标签并插入到 HTML 文件中
      const insertLinks = async () => {
        const files = await glob("dist/**/*.html")
        const links = [...urls]
          .map((url) => `<link rel="dns-prefetch" href="${url}">`)
          .join("\n")

        for (const file of files) {
          const html = fs.readFileSync(file, "utf-8")
          const root = parse(html)
          const head = root.querySelector("head")
          if (head) {
            head.insertAdjacentHTML("afterbegin", links)
            fs.writeFileSync(file, root.toString(), "utf-8")
          }
        }
      }

      await searchDomain()
      await insertLinks()
    },
  }
}

module.exports = dnsPrefetchPlugin

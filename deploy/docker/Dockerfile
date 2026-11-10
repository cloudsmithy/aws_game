# 亚马逊云科技 User Group 云上大亨：用 nginx 把网页版和 PDF 手册当静态文件发出来
#
# 构建（在仓库根目录跑）：docker build -f deploy/docker/Dockerfile -t aws-ug-tycoon .
# 运行：docker run --rm -p 127.0.0.1:8080:8080 aws-ug-tycoon
#       然后浏览器打开 http://127.0.0.1:8080/
#
# 端口只发布到本机（127.0.0.1）。容器里 nginx 监听 8080 所有网卡没关系，对外的边界是 -p 这一步；
# 别写成 -p 8080:8080，那样会发布到所有网卡，同一网络里的任何人都能打开。
# 别的电脑要用：直接把 code/ 整个文件夹拷过去，用浏览器打开 code/index.html 就行（联机走浏览器之间的 WebRTC，不经过这个服务器）；
# 一定要连这台机器的话，用 SSH 隧道：ssh -L 8080:127.0.0.1:8080 这台机器
FROM nginx:alpine

# 用自己的整份配置：普通用户运行、监听 8080（非特权端口，不需要 root）
COPY deploy/docker/nginx.conf /etc/nginx/nginx.conf
RUN rm -f /etc/nginx/conf.d/default.conf /usr/share/nginx/html/*

# 只放玩家要用的：网页、PDF 手册、更新说明；规则源文件、生成脚本、测试、编辑器设置都不进镜像（见旁边的 Dockerfile.dockerignore）
# 网站的根就是 code/（和 GitHub Pages、成都服务器一样），只发布网页和讲解音频：对照表 code/i18n/ 在 .dockerignore 里排掉，
# 文档只放更新说明；手册 PDF 和 md 留在仓库里
COPY --chown=nginx:nginx code/ /usr/share/nginx/html/
COPY --chown=nginx:nginx docs/更新说明.html /usr/share/nginx/html/docs/

USER nginx
EXPOSE 8080

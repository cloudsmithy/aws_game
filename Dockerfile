# 亚马逊云科技 User Group 云上大亨：用 nginx 把网页版和 PDF 手册当静态文件发出来
#
# 构建：docker build -t aws-ug-tycoon .
# 运行：docker run --rm -p 127.0.0.1:8080:8080 aws-ug-tycoon
#       然后浏览器打开 http://127.0.0.1:8080/
#
# 端口只发布到本机（127.0.0.1）。容器里 nginx 监听 8080 所有网卡没关系，对外的边界是 -p 这一步；
# 别写成 -p 8080:8080，那样会发布到所有网卡，同一网络里的任何人都能打开。
# 别的电脑要用：直接把 code/ 整个文件夹拷过去，用浏览器打开 code/index.html 就行（联机走浏览器之间的 WebRTC，不经过这个服务器）；
# 一定要连这台机器的话，用 SSH 隧道：ssh -L 8080:127.0.0.1:8080 这台机器
FROM nginx:alpine

# 用自己的整份配置：普通用户运行、监听 8080（非特权端口，不需要 root）
COPY docker/nginx.conf /etc/nginx/nginx.conf
RUN rm -f /etc/nginx/conf.d/default.conf /usr/share/nginx/html/*

# 只放玩家要用的：网页、PDF 手册、更新说明；规则源文件、生成脚本、编辑器设置都不进镜像（见 .dockerignore）
COPY --chown=nginx:nginx index.html 404.html 更新说明.html /usr/share/nginx/html/
COPY --chown=nginx:nginx code/ /usr/share/nginx/html/code/
COPY --chown=nginx:nginx en/ /usr/share/nginx/html/en/
COPY --chown=nginx:nginx zh/ /usr/share/nginx/html/zh/
COPY --chown=nginx:nginx 更新说明.pdf /usr/share/nginx/html/
COPY --chown=nginx:nginx 手册/ /usr/share/nginx/html/手册/

USER nginx
EXPOSE 8080

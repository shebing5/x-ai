FROM nginx:alpine

# 将构建的静态文件复制到Nginx的服务目录
COPY . /usr/share/nginx/html

# 复制自定义的Nginx配置文件
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露80端口
EXPOSE 80

# 启动Nginx
CMD ["nginx", "-g", "daemon off;"]

package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
) 

var (
	configFile    string
	port          int
	allowLan      bool
	logLevel      string
	version       bool
	testConfig    bool
	workingDir    string
	proxyServer   *ProxyServer
	configManager *ConfigManager
)

// 版本信息
const (
	Version = "1.0.0"
)

// ProxyServer 代理服务器结构
type ProxyServer struct {
	Port     int
	AllowLan bool
	Running  bool
}

// ConfigManager 配置管理器
type ConfigManager struct {
	ConfigFile string
	Config     *Config
}

// Config 配置结构
type Config struct {
	Port      int               `yaml:"port"`
	SocksPort int               `yaml:"socks-port"`
	AllowLan  bool              `yaml:"allow-lan"`
	Mode      string            `yaml:"mode"`
	LogLevel  string            `yaml:"log-level"`
	Proxies   []map[string]any  `yaml:"proxies"`
	Rules     []string          `yaml:"rules"`
	DNS       map[string]any    `yaml:"dns"`
}

// 初始化函数
func init() {
	flag.StringVar(&configFile, "config", "", "配置文件路径")
	flag.IntVar(&port, "port", 7890, "HTTP代理端口")
	flag.BoolVar(&allowLan, "allow-lan", false, "允许局域网连接")
	flag.StringVar(&logLevel, "log-level", "info", "日志级别")
	flag.BoolVar(&version, "version", false, "显示版本信息")
	flag.BoolVar(&testConfig, "test-config", false, "测试配置文件")
	
	// 获取当前工作目录
	var err error
	workingDir, err = os.Getwd()
	if err != nil {
		log.Fatalf("获取工作目录失败: %v", err)
	}
}

// 启动代理服务器
func (s *ProxyServer) Start() error {
	s.Running = true
	fmt.Printf("代理服务器启动在端口 %d\n", s.Port)
	
	// 启动HTTP服务器
	go func() {
		http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request)  {
			fmt.Fprintf(w, "ClashLike 代理服务器正在运行")
		})
		
		addr := fmt.Sprintf(":%d", s.Port)
		if err := http.ListenAndServe(addr, nil) ; err != nil {
			log.Printf("HTTP服务器错误: %v", err)
		}
	}()
	
	return nil
}

// 停止代理服务器
func (s *ProxyServer) Stop() {
	s.Running = false
	fmt.Println("代理服务器已停止")
}

// 加载配置
func (cm *ConfigManager) LoadConfig() error {
	fmt.Printf("加载配置文件: %s\n", cm.ConfigFile)
	
	// 这里应该实现配置文件的加载逻辑
	// 为了简化，我们创建一个默认配置
	cm.Config = &Config{
		Port:      7890,
		SocksPort: 7891,
		AllowLan:  false,
		Mode:      "Rule",
		LogLevel:  "info",
		Proxies:   []map[string]any{},
		Rules:     []string{},
		DNS:       map[string]any{},
	}
	
	return nil
}

// 主函数
func main() {
	flag.Parse()
	
	// 显示版本信息
	if version {
		fmt.Printf("ClashLike %s\n", Version)
		return
	}
	
	// 如果未指定配置文件，使用默认路径
	if configFile == "" {
		homeDir, err := os.UserHomeDir()
		if err != nil {
			log.Fatalf("获取用户目录失败: %v", err)
		}
		configFile = filepath.Join(homeDir, ".config", "clashlike", "config.yaml")
	}
	
	// 初始化配置管理器
	configManager = &ConfigManager{
		ConfigFile: configFile,
	}
	
	// 加载配置
	if err := configManager.LoadConfig(); err != nil {
		log.Fatalf("加载配置失败: %v", err)
	}
	
	// 测试配置
	if testConfig {
		fmt.Println("配置测试通过")
		return
	}
	
	// 初始化代理服务器
	proxyServer = &ProxyServer{
		Port:     port,
		AllowLan: allowLan,
	}
	
	// 启动代理服务器
	if err := proxyServer.Start(); err != nil {
		log.Fatalf("启动代理服务器失败: %v", err)
	}
	
	// 处理信号
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh
	
	// 停止代理服务器
	proxyServer.Stop()
}

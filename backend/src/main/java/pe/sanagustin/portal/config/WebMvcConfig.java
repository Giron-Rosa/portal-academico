package pe.sanagustin.portal.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import java.io.File;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Carpeta local para audios
        File audiosDir = new File("uploads/audios");
        if (!audiosDir.exists()) {
            audiosDir.mkdirs();
        }
        
        String uploadPath = audiosDir.getAbsolutePath();
        registry.addResourceHandler("/uploads/audios/**")
                .addResourceLocations("file:" + uploadPath + "/");
    }
}

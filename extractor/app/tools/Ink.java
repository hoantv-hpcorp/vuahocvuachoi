import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.File;

public class Ink {
    public static void main(String[] a) throws Exception {
        BufferedImage img = ImageIO.read(new File(a[0]));
        int w = img.getWidth(), h = img.getHeight();
        boolean[] rowInk = new boolean[h];
        int[] rowMinX = new int[h], rowMaxX = new int[h];
        for (int y = 0; y < h; y++) {
            rowMinX[y] = w; rowMaxX[y] = -1;
            for (int x = 0; x < w; x++) {
                int p = img.getRGB(x, y);
                int r = (p >> 16) & 0xff, g = (p >> 8) & 0xff, b = p & 0xff;
                if (r < 235 || g < 235 || b < 235) {
                    rowInk[y] = true;
                    if (x < rowMinX[y]) rowMinX[y] = x;
                    if (x > rowMaxX[y]) rowMaxX[y] = x;
                }
            }
        }
        int start = -1;
        for (int y = 0; y <= h; y++) {
            boolean ink = y < h && rowInk[y];
            if (ink && start < 0) start = y;
            if (!ink && start >= 0) {
                int minX = w, maxX = -1;
                for (int yy = start; yy < y; yy++) {
                    if (rowMinX[yy] < minX) minX = rowMinX[yy];
                    if (rowMaxX[yy] > maxX) maxX = rowMaxX[yy];
                }
                System.out.println("band y=" + start + ".." + (y - 1) + " x=" + minX + ".." + maxX
                        + " h=" + (y - start) + " w=" + (maxX - minX + 1));
                start = -1;
            }
        }
    }
}
